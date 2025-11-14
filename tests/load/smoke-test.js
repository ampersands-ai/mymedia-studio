/**
 * K6 Smoke Test: Basic functionality check
 *
 * Quick test to verify system can handle basic load
 * Run before full 10K user test
 *
 * Target: 100 concurrent users for 2 minutes
 *
 * Usage:
 * k6 run tests/load/smoke-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 100 },   // Hold at 100 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'],
    'errors': ['rate<0.01'],
    'http_req_failed': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://artifio.ai';

export default function () {
  // Test homepage
  const homeRes = http.get(BASE_URL);
  check(homeRes, {
    'homepage is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // Test API health
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(2);
}

export function setup() {
  console.log('🔥 Running smoke test (100 concurrent users)...');
}

export function teardown() {
  console.log('✅ Smoke test completed');
}
