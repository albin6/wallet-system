import http from "k6/http";
import { check, sleep } from "k6";

// API Base URL
const API_BASE = "http://localhost:3030/api/user";

// Test user
const TEST_USER_ID = "67ecfe442c68fb4eccea35f6";
const RECEIVER_ID = "test-receiver";

export const options = {
  stages: [
    { duration: "10s", target: 50 },  // Ramp up to 50 users in 10s
    { duration: "20s", target: 200 }, // Hold 200 users for 20s
    { duration: "10s", target: 0 },   // Ramp down to 0
  ],
};

export default function () {
  const depositPayload = JSON.stringify({
    userId: TEST_USER_ID,
    amount: 10,
  });

  const payoutPayload = JSON.stringify({
    userId: TEST_USER_ID,
    receiverId: RECEIVER_ID,
    amount: 20,
  });

  const headers = { "Content-Type": "application/json" };

  // Randomly perform deposit or payout
  const randomAction = Math.random() > 0.5 ? "deposit" : "payout";
  const res = http.post(`${API_BASE}/${randomAction}`, randomAction === "deposit" ? depositPayload : payoutPayload, { headers });

  check(res, {
    "is status 200": (r) => r.status === 200,
    "is response time < 500ms": (r) => r.timings.duration < 500,
  });

  sleep(1);
}
