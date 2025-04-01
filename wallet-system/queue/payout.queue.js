import { Queue, Worker } from 'bullmq';
import { Transaction } from '../models/transaction.model.js';
import { Wallet } from '../models/wallet.model.js';

// Redis connection configuration
const redisConnection = {
  host: 'localhost',
  port: 6379,
};

// Create a BullMQ queue for payouts
const payoutQueue = new Queue('payouts', { connection: redisConnection });

// Timeout constant
const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// Function to add a payout to the queue
export const processPayout = async (transaction) => {
  await payoutQueue.add('payout', { transactionId: transaction._id }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
};

// Worker to process the payout queue
const payoutWorker = new Worker(
  'payouts',
  async (job) => {
    const { transactionId } = job.data;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction || transaction.status !== 'processing') {
      throw new Error('Invalid or already processed transaction');
    }

    const wallet = await Wallet.findById(transaction.walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const timeElapsed = Date.now() - transaction.createdAt.getTime();
    if (timeElapsed > TIMEOUT_MS) {
      transaction.status = 'failed';
      wallet.heldBalance -= transaction.amount;
      wallet.availableBalance += transaction.amount;
      await wallet.save();
      await transaction.save();
      console.log(`Transaction ${transactionId} timed out and failed`);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    transaction.status = 'processing';
    transaction.updatedAt = Date.now();
    await transaction.save();

    console.log(`Processed payout for transaction ${transactionId}`);
  },
  {
    connection: redisConnection,
    concurrency: 500,
  }
);

// Handle worker errors
payoutWorker.on('failed', async (job, error) => {
  console.error(`Job ${job.id} failed with error: ${error.message}`);
  const transaction = await Transaction.findById(job.data.transactionId);
  if (transaction && job.attemptsMade >= 3) {
    transaction.status = 'failed';
    const wallet = await Wallet.findById(transaction.walletId);
    if (wallet) {
      wallet.heldBalance -= transaction.amount;
      wallet.availableBalance += transaction.amount;
      await wallet.save();
    }
    await transaction.save();
  }
});

// Handle worker completion
payoutWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});