import { Queue, Worker } from "bullmq";
import { Transaction } from "../models/transaction.model.js";
import { AdminWallet } from "../models/wallet.model.js";
import { UserBalance } from "../models/user-balance.model.js";

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || "redis",
  port: process.env.REDIS_PORT || 6379,
};

// Create a BullMQ queue for deposits
const depositQueue = new Queue("deposits", { connection: redisConnection });

// Function to add a deposit to the queue
export const processDeposit = async (transaction) => {
  await depositQueue.add(
    "deposit",
    { transactionId: transaction._id },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    }
  );
};

// Worker to process deposit queue
const depositWorker = new Worker(
  "deposits",
  async (job) => {
    const { transactionId } = job.data;
    const transaction = await Transaction.findById(transactionId);
    if (
      !transaction ||
      transaction.status !== "processing" ||
      transaction.type !== "deposit"
    ) {
      throw new Error(
        "Invalid, already processed, or not a deposit transaction"
      );
    }

    const [adminWallet, userWallet] = await Promise.all([
      AdminWallet.findOne(),
      UserBalance.findById(transaction.walletId),
    ]);

    if (!adminWallet) throw new Error("Admin wallet not found");
    if (!userWallet) throw new Error("User wallet not found");

    // Update balances
    adminWallet.balance += transaction.amount;
    userWallet.availableBalance += transaction.amount;

    // Save both wallets concurrently
    await Promise.all([adminWallet.save(), userWallet.save()]);

    transaction.status = "success";
    await transaction.save();

    console.log(`Processed deposit ${transactionId}`);
  },
  {
    connection: redisConnection,
    concurrency: 5000,
  }
);

// Handle deposit job failures
depositWorker.on("failed", async (job, error) => {
  console.error(`Job ${job.id} failed: ${error.message}`);
});

// Handle deposit job completion
depositWorker.on("completed", (job) => {
  console.log(`Deposit Job ${job.id} completed successfully`);
});
