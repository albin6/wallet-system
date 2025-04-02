import { Queue, Worker } from "bullmq";
import { UserBalance } from "../models/user-balance.model.js";
import { AdminWallet } from "../models/wallet.model.js";
import { Transaction } from "../models/transaction.model.js";

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
    if (!transaction || transaction.status !== "processing" || transaction.type !== "deposit") {
      throw new Error("Invalid, already processed, or not a deposit transaction");
    }

    // const userBalance = await UserBalance.findOne({ userId: transaction.userId });
    // if (!userBalance) throw new Error("User balance not found");

    // // Update balances
    // userBalance.availableBalance += transaction.amount;
    // await userBalance.save();

    // const adminWallet = await AdminWallet.findOne();
    // if (!adminWallet) throw new Error("Admin wallet not found");
    
    // // Reflect the deposit in the AdminWallet
    // adminWallet.balance += transaction.amount;
    
    // await adminWallet.save();

    // Update transaction status to success
    transaction.status = "processing";
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
