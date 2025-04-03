import http from 'k6/http';
import { sleep, check } from 'k6';

export let options = {
  scenarios: {
    deposits: {
      executor: 'constant-arrival-rate',
      rate: 500,      // 500 requests per second
      timeUnit: '1s',
      duration: '10s',
      preAllocatedVUs: 500,
    },
    payouts: {
      executor: 'constant-arrival-rate',
      rate: 300,      // 300 requests per second
      timeUnit: '1s',
      duration: '10s',
      preAllocatedVUs: 300,
    },
    // burst: {
    //   executor: 'constant-arrival-rate',
    //   rate: 1000,     // 1000 requests per second
    //   timeUnit: '1s',
    //   duration: '5s',
    //   preAllocatedVUs: 1000,
    // },
  },
  timeouts: {
    http: '10s', // Increase timeout to 10s to avoid 5s cutoff
  },
};

export default function () {
  const depositPayload = JSON.stringify({
    userId: "67ecfe442c68fb4eccea35f6",
    amount: 100,
    requestId: `${Date.now()}-${Math.random()}`,
  });
  const payoutPayload = JSON.stringify({
    userId: "67ecfe442c68fb4eccea35f6",
    receiverId: "otherUser",
    amount: 50,
    requestId: `${Date.now()}-${Math.random()}`,
  });

  const depositRes = http.post('http://localhost:3030/api/user/deposit', depositPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(depositRes, {
    'Deposit success': (r) => r.status === 202,
  }) || console.log(`Deposit failed: ${depositRes.status} - ${depositRes.body}`);

  const payoutRes = http.post('http://localhost:3030/api/user/payout', payoutPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(payoutRes, {
    'Payout success': (r) => r.status === 201,
  }) || console.log(`Payout failed: ${payoutRes.status} - ${payoutRes.body}`);

  sleep(0.1);
}