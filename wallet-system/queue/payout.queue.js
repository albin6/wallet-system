import { Queue, Worker } from 'bullmq';
import { Transaction } from '../models/transaction.model.js';
import { UserBalance } from '../models/user-balance.model.js';

// Redis connection configuration
const redisConnection = {
  host: 'localhost',
  port: 6379,
};

// Create a BullMQ queue for payouts
const payoutQueue = new Queue("payouts", { connection: redisConnection });
const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// Function to add a payout to the queue
export const processPayout = async (transaction) => {
  await payoutQueue.add("payout", { transactionId: transaction._id }, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  });
};

const payoutWorker = new Worker(
  "payouts",
  async (job) => {
    const { transactionId } = job.data;
    const transaction = await Transaction.findById(transactionId);
    if (!transaction || transaction.status !== "processing") {
      throw new Error("Invalid or already processed transaction");
    }

    const userBalance = await UserBalance.findOne({ userId: transaction.userId });
    if (!userBalance) throw new Error("User balance not found");

    // Check for timeout
    if (Date.now() - transaction.createdAt.getTime() > TIMEOUT_MS) {
      transaction.status = "failed";
      userBalance.holdBalance -= transaction.amount;
      userBalance.availableBalance += transaction.amount;
      await userBalance.save();
      await transaction.save();
      console.log(`Transaction ${transactionId} timed out and failed`);
      return;
    }

    // Update balances for payout
    await userBalance.save();

    // Update transaction status to success
    transaction.status = "processing";
    await transaction.save();

    console.log(`Processed payout for transaction ${transactionId}`);
  },
  {
    connection: redisConnection,
    concurrency: 5000,
  }
);

// Handle payout job failures
payoutWorker.on("failed", async (job, error) => {
  console.error(`Job ${job.id} failed: ${error.message}`);
  const transaction = await Transaction.findById(job.data.transactionId);
  if (transaction && job.attemptsMade >= 3) {
    transaction.status = "failed";
    const userBalance = await UserBalance.findOne({ userId: transaction.userId });
    if (userBalance) {
      userBalance.holdBalance -= transaction.amount;
      userBalance.availableBalance += transaction.amount;
      await userBalance.save();
    }
    await transaction.save();
  }
});

// Handle payout job completion
payoutWorker.on("completed", (job) => {
  console.log(`Payout Job ${job.id} completed successfully`);
});
