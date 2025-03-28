import { Wallet } from '../models/wallet.model.js';
import { Transaction } from '../models/transaction.model.js';

import AsyncLock from 'async-lock';
import mongoose from 'mongoose';
const lock = new AsyncLock();

export const getPendingPayouts = async (req, res) => {
  try {
    const transactions = await Transaction.find({ status: 'processing' });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const handlePayout = async (req, res) => {
  const { transactionId, action } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await lock.acquire(`transaction-${transactionId}`, async () => {
      const transaction = await Transaction.findById(transactionId).session(session);
      if (!transaction) {
        await session.abortTransaction();
        return res.status(404).json({ error: "Transaction not found" });
      }
      if (transaction.status !== "processing") {
        await session.abortTransaction();
        return res.status(400).json({ error: "Invalid transaction status" });
      }

      const senderWallet = await Wallet.findById(transaction.walletId).session(session);
      if (!senderWallet) {
        await session.abortTransaction();
        return res.status(404).json({ error: "Sender wallet not found" });
      }

      if (action === "approve") {
        const receiverWallet = await Wallet.findOne({userId: transaction.receiverId}).session(session);
        if (!receiverWallet) {
          await session.abortTransaction();
          return res.status(404).json({ error: "Receiver wallet not found" });
        }

        senderWallet.heldBalance -= transaction.amount;

        // Credit receiver's wallet
        receiverWallet.availableBalance += transaction.amount;
        await receiverWallet.save({ session });

        // Update transaction status
        transaction.status = "success";
      } else if (action === "reject") {
        // Refund the held amount to sender's available balance
        senderWallet.heldBalance -= transaction.amount;
        senderWallet.availableBalance += transaction.amount;

        // Mark transaction as failed
        transaction.status = "failed";
      } else {
        await session.abortTransaction();
        return res.status(400).json({ error: "Invalid action" });
      }

      transaction.updatedAt = Date.now();
      await transaction.save({ session });
      await senderWallet.save({ session });

      await session.commitTransaction(); // Commit transaction
      session.endSession();

      res.json({ transaction, message: `Payout ${action}d` });
    });
  } catch (error) {
    await session.abortTransaction(); // Rollback on error
    session.endSession();
    res.status(500).json({ error: error.message });
  }
};
