import { User } from '../models/user.model.js';
import { Wallet } from '../models/wallet.model.js';
import { Transaction } from '../models/transaction.model.js';
import { processPayout } from '../queue/payout.queue.js'
import { processDeposit } from '../queue/deposit.queue.js';

import AsyncLock from 'async-lock';
import mongoose from 'mongoose';
const lock = new AsyncLock();


// Create a new user and their wallet
export const createUser = async (req, res) => {
  const { username, role } = req.body;

  try {
    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Create the user
    const user = new User({ username, role });
    await user.save();

    // Create the wallet for the user
    const wallet = new Wallet({ userId: user._id });
    await wallet.save();

    res.status(201).json({ user, wallet });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const loginUser = async (req, res) => {
  const { username, role } = req.body;

  try {
    // Check if username exists
    const existingUser = await User.findOne({ username, role });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ user: { name : existingUser.username, id: existingUser._id} });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getWallet = async (req, res) => {
  const { userId } = req.params;
  try {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
    const transactions = await Transaction.find({ userId });
    res.json({ wallet, transactions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const requestPayout = async (req, res) => {
  const { userId, receiverId, amount } = req.body;
  const DAILY_LIMIT = 10000;

  if (userId === receiverId) {
    return res.status(400).json({ error: "You cannot send payouts to yourself" });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: "Invalid payout amount" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await lock.acquire(`wallet-${userId}`, async () => {
      const wallet = await Wallet.findOne({ userId }).session(session);
      if (!wallet) {
        await session.abortTransaction();
        return res.status(404).json({ error: "Wallet not found" });
      }

      // Check Daily Limit inside the lock
      const today = new Date().setHours(0, 0, 0, 0);
      const dailyTotal = await Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            createdAt: { $gte: new Date(today) },
            status: { $ne: "failed" },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]).session(session);

      const usedAmount = dailyTotal[0]?.total || 0;
      if (usedAmount + amount > DAILY_LIMIT) {
        await session.abortTransaction();
        return res.status(400).json({ error: "Daily payout limit exceeded" });
      }

      // Check available balance
      if (wallet.availableBalance < amount) {
        await session.abortTransaction();
        return res.status(400).json({ error: "Insufficient balance" });
      }

      // Update Wallet
      wallet.availableBalance -= amount;
      wallet.heldBalance += amount;
      await wallet.save({ session });

      // Create Transaction
      const transaction = new Transaction({
        userId,
        receiverId,
        walletId: wallet._id,
        amount,
        status: "processing",
        createdAt: new Date(),
      });

      await transaction.save({ session });

      await session.commitTransaction();
      session.endSession();

      await processPayout(transaction); // Add to queue

      res.status(201).json({ transaction, message: "Payout request submitted" });
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: error.message });
  }
};

export const deposit = async (req, res) => {
  const { userId, amount } = req.body;

  if (!userId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'userId and positive amount are required' });
  }

  try {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    const transaction = new Transaction({
      userId,
      receiverId: null,
      walletId: wallet._id,
      amount,
      status: 'processing',
      type: 'deposit',
    });
    await transaction.save();

    await processDeposit(transaction);

    res.status(202).json({ transaction, message: 'Deposit request queued' });
  } catch (error) {
    console.error(`Deposit error: ${error.stack}`);
    res.status(500).json({ error: error.message });
  }
};