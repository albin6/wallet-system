import { Queue, Worker } from "bullmq";
import { Transaction } from "../models/transaction.model.js";
import { Wallet } from "../models/wallet.model.js";

// Redis connection configuration
const redisConnection = {
  host: "localhost", // Change to your Redis host if not local
  port: 6379, // Default Redis port
};

// Create a BullMQ queue for deposits
const depositQueue = new Queue("deposits", { connection: redisConnection });

// Export function to add a deposit to the queue
export const processDeposit = async (transaction) => {
  await depositQueue.add(
    "deposit",
    { transactionId: transaction._id },
    {
      attempts: 3, // Retry up to 3 times on failure
      backoff: {
        type: "exponential",
        delay: 1000, // Start with 1s delay, increases exponentially
      },
    }
  );
};

// Worker to process the deposit queue
const depositWorker = new Worker(
  "deposits",
  async (job) => {
    const { transactionId } = job.data;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction || transaction.status !== "processing" || transaction.type !== "deposit") {
      throw new Error("Invalid, already processed, or not a deposit transaction");
    }

    const walletUpdate = await Wallet.updateOne(
      { _id: transaction.walletId },
      { 
        $inc: { availableBalance: transaction.amount },
        $set: { updatedAt: Date.now() }
      }
    );
    if (walletUpdate.matchedCount === 0) {
      throw new Error("Wallet not found");
    }

    transaction.status = "success";
    transaction.updatedAt = Date.now();
    await transaction.save();

    console.log(`Processed deposit ${transactionId}`);
  },
  {
    connection: redisConnection,
    concurrency: 500,
  }
);

// Handle worker errors
depositWorker.on("failed", async (job, error) => {
  console.error(`Job ${job.id} failed with error: ${error.message}`);
  const transaction = await Transaction.findById(job.data.transactionId);
  if (transaction) {
    transaction.status = "failed";
    await transaction.save();
  }
});

// Handle worker completion
depositWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});
