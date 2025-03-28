import http from 'k6/http';
import { check, sleep } from 'k6';

// Test configuration
export const options = {
  vus: 5000,
  duration: '1s',
};

export default function () {
  const payload = JSON.stringify({
    userId: '67e6776d746934901c99438a', // Valid userId
    amount: 1, // Add amount
  });
  const res = http.post('http://localhost:3000/deposit', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, { 'is status 202': (r) => r.status === 202 });
  sleep(0.001);
} 