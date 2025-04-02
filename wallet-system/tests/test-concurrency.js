import assert from "assert";
import axios from "axios";
import mongoose from "mongoose";
import { UserBalance } from "../models/user-balance.model.js";
import { Transaction } from "../models/transaction.model.js";


const API_BASE = "http://localhost:3030/api/user";
const TEST_USER_ID = "67ecfe442c68fb4eccea35f6";

// Setup test database connection
before(async () => {
  await mongoose.connect(
    process.env.MONGO_URI || "mongodb://localhost:27017/test_db"
  );

  // Clean up and initialize test user balance
  await UserBalance.deleteMany({ userId: TEST_USER_ID });
  await UserBalance.create({
    userId: TEST_USER_ID,
    availableBalance: 100000,
    holdBalance: 0,
  });
});

after(async () => {
  await mongoose.connection.close();
});

describe("Concurrent Deposits", () => {
  it("handles 500 concurrent deposit requests", async () => {
    const DEPOSIT_COUNT = 500;
    const AMOUNT = 10;

    const depositPromises = Array(DEPOSIT_COUNT)
      .fill()
      .map(() =>
        axios.post(`${API_BASE}/deposit`, {
          userId: TEST_USER_ID,
          amount: AMOUNT,
        })
      );

    const responses = await Promise.all(depositPromises);
    const jobs = await Promise.all(
      responses.map((res) => depositQueue.getJob(res.data.transaction._id))
    );
    await Promise.all(jobs.map((job) => job.waitUntilFinished(depositQueue.client)));

    const wallet = await UserBalance.findOne({ userId: TEST_USER_ID });
    const transactions = await Transaction.find({
      userId: TEST_USER_ID,
      type: "deposit",
      status: "success", // Expect all to be processed
    });

    assert.strictEqual(responses.length, DEPOSIT_COUNT);
    assert.strictEqual(transactions.length, DEPOSIT_COUNT);
    assert.strictEqual(
      wallet.availableBalance,
      100000 + DEPOSIT_COUNT * AMOUNT
    );
  }).timeout(60000);
});

describe("Concurrent Payouts", () => {
  it("handles 300 concurrent payout requests", async () => {
    const PAYOUT_COUNT = 300;
    const AMOUNT = 20;

    const payoutPromises = Array(PAYOUT_COUNT)
      .fill()
      .map(() =>
        axios
          .post(`${API_BASE}/payout`, {
            userId: TEST_USER_ID,
            receiverId: "test-receiver",
            amount: AMOUNT,
          })
          .catch((err) => ({ error: err }))
      );

    const responses = await Promise.all(payoutPromises);
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const wallet = await UserBalance.findOne({ userId: TEST_USER_ID });
    const transactions = await Transaction.find({
      userId: TEST_USER_ID,
      type: "payout",
      status: "processing",
    });

    assert.strictEqual(responses.length, PAYOUT_COUNT);
    assert.strictEqual(transactions.length, PAYOUT_COUNT);
    assert.strictEqual(
      wallet.holdBalance,
      PAYOUT_COUNT * AMOUNT,
      "Hold balance should reflect all payouts"
    );
  }).timeout(10000);
});

describe("Data Consistency", () => {
  it("maintains consistency with mixed operations", async () => {
    const DEPOSITS = 300;
    const PAYOUTS = 200;
    const DEPOSIT_AMOUNT = 15;
    const PAYOUT_AMOUNT = 10;

    const mixedPromises = [
      ...Array(DEPOSITS)
        .fill()
        .map(() =>
          axios
            .post(`${API_BASE}/deposit`, {
              userId: TEST_USER_ID,
              amount: DEPOSIT_AMOUNT,
            })
            .catch((err) => ({ error: err }))
        ),
      ...Array(PAYOUTS)
        .fill()
        .map(() =>
          axios
            .post(`${API_BASE}/payout`, {
              userId: TEST_USER_ID,
              receiverId: "test-receiver",
              amount: PAYOUT_AMOUNT,
            })
            .catch((err) => ({ error: err }))
        ),
    ];

    await Promise.all(mixedPromises);
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const wallet = await UserBalance.findOne({ userId: TEST_USER_ID });
    const expectedAvailable =
      100000 + DEPOSITS * DEPOSIT_AMOUNT - PAYOUTS * PAYOUT_AMOUNT;
    const expectedHold = PAYOUTS * PAYOUT_AMOUNT;

    assert.strictEqual(
      wallet.availableBalance,
      expectedAvailable,
      "Available balance mismatch"
    );
    assert.strictEqual(
      wallet.holdBalance,
      expectedHold,
      "Hold balance mismatch"
    );
  }).timeout(15000);
});

describe("High Load Test", () => {
  it("handles 1000+ transactions in burst", async () => {
    const TOTAL_REQUESTS = 1000;

    const burstPromises = Array(TOTAL_REQUESTS)
      .fill()
      .map((_, i) =>
        i % 2 === 0
          ? axios
              .post(`${API_BASE}/deposit`, { userId: TEST_USER_ID, amount: 10 })
              .catch((err) => ({ error: err }))
          : axios
              .post(`${API_BASE}/payout`, {
                userId: TEST_USER_ID,
                receiverId: "test-receiver",
                amount: 5,
              })
              .catch((err) => ({ error: err }))
      );

    await Promise.all(burstPromises);
    await new Promise((resolve) => setTimeout(resolve, 10000));

    const transactions = await Transaction.countDocuments({
      userId: TEST_USER_ID,
    });
    assert.strictEqual(
      transactions,
      TOTAL_REQUESTS,
      "Transaction count mismatch"
    );
  }).timeout(20000);
});

// Note: Crash recovery test requires worker control implementation
// You'd need to add worker stop/start logic to test this properly
