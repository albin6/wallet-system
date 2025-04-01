import { Transaction } from "../models/transaction.model.js";
import { UserBalance } from "../models/user-balance.model.js"; // Updated import

import AsyncLock from "async-lock";
import mongoose from "mongoose";
import { AdminWallet } from "../models/wallet.model.js";
const lock = new AsyncLock();

export const getPendingPayouts = async (req, res) => {
  try {
    // Find transactions that are still processing
    const [transactions, adminWallet] = await Promise.all([
      Transaction.find({ status: "processing" }),
      AdminWallet.findOne({}),
    ]);
    res.json({ transactions, adminWallet });
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
      const transaction = await Transaction.findById(transactionId).session(
        session
      );
      if (!transaction) {
        await session.abortTransaction();
        return res.status(404).json({ error: "Transaction not found" });
      }
      if (transaction.status !== "processing") {
        await session.abortTransaction();
        return res.status(400).json({ error: "Invalid transaction status" });
      }

      // Find the user balance associated with this transaction
      const senderBalance = await UserBalance.findById(
        transaction.walletId
      ).session(session);
      if (!senderBalance) {
        await session.abortTransaction();
        return res.status(404).json({ error: "Sender's balance not found" });
      }

      if (action === "approve") {
        // const receiverBalance = await UserBalance.findOne({
        //   userId: transaction.receiverId,
        // }).session(session);
        // if (!receiverBalance) {
        //   await session.abortTransaction();
        //   return res
        //     .status(404)
        //     .json({ error: "Receiver's balance not found" });
        // }

        // Deduct amount from the sender's hold balance and update available balance
        senderBalance.holdBalance -= transaction.amount;
        await AdminWallet.findOneAndUpdate(
          {},
          {
            $inc: { balance: -transaction.amount },
          }
        );

        // Credit the receiver's available balance
        // receiverBalance.availableBalance += transaction.amount;
        // await receiverBalance.save({ session });

        // Update transaction status to success
        transaction.status = "success";
      } else if (action === "reject") {
        // Refund the amount to the sender's available balance
        senderBalance.holdBalance -= transaction.amount;
        senderBalance.availableBalance += transaction.amount;

        // Mark transaction as failed
        transaction.status = "failed";
      } else {
        await session.abortTransaction();
        return res.status(400).json({ error: "Invalid action" });
      }

      // Update the transaction's status and save
      transaction.updatedAt = Date.now();
      await transaction.save({ session });
      await senderBalance.save({ session });

      await session.commitTransaction(); // Commit transaction
      session.endSession();

      res.json({ transaction, message: `Payout ${action}d successfully` });
    });
  } catch (error) {
    await session.abortTransaction(); // Rollback on error
    session.endSession();
    res.status(500).json({ error: error.message });
  }
};
