/**
 * K6 Load Test: 10,000 Concurrent Users
 *
 * Test Scenario: Simulate 10K users accessing Artifio.ai and performing typical actions
 * - Login
 * - Browse templates
 * - Generate images
 * - View history
 *
 * Success Criteria:
 * - p95 response time < 3s
 * - Error rate < 1%
 * - No database connection exhaustion
 * - No memory leaks
 *
 * Usage:
 * k6 run tests/load/10k-concurrent-users.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const generationDuration = new Trend('generation_duration');
const generationSuccess = new Rate('generation_success');
const apiErrors = new Counter('api_errors');

// Test configuration
export const options = {
  stages: [
    // Ramp-up: 0 → 2,000 users in 2 minutes
    { duration: '2m', target: 2000 },

    // Ramp-up: 2,000 → 5,000 users in 3 minutes
    { duration: '3m', target: 5000 },

    // Ramp-up: 5,000 → 10,000 users in 5 minutes
    { duration: '5m', target: 10000 },

    // Sustain: Hold 10,000 users for 10 minutes
    { duration: '10m', target: 10000 },

    // Ramp-down: 10,000 → 0 users in 5 minutes
    { duration: '5m', target: 0 },
  ],

  thresholds: {
    // p95 response time must be < 3s
    'http_req_duration': ['p(95)<3000'],

    // Error rate must be < 1%
    'errors': ['rate<0.01'],

    // 99% of requests should succeed
    'http_req_failed': ['rate<0.01'],

    // Generation success rate > 99%
    'generation_success': ['rate>0.99'],
  },
};

// Environment configuration
const BASE_URL = __ENV.BASE_URL || 'https://artifio.ai';
const API_BASE = `${BASE_URL}/functions/v1`;

// 🔒 SECURITY: Load test credentials from environment variables
// Set these in your environment or k6 cloud config:
// - K6_TEST_USER_EMAIL_1, K6_TEST_USER_PASSWORD_1
// - K6_TEST_USER_EMAIL_2, K6_TEST_USER_PASSWORD_2
// - K6_TEST_USER_EMAIL_3, K6_TEST_USER_PASSWORD_3
const TEST_USERS = [];

// Load users from environment variables
for (let i = 1; i <= 10; i++) {
  const email = __ENV[`K6_TEST_USER_EMAIL_${i}`];
  const password = __ENV[`K6_TEST_USER_PASSWORD_${i}`];

  if (email && password) {
    TEST_USERS.push({ email, password });
  }
}

// Fallback to default test users if no env vars provided (LOCAL TESTING ONLY)
if (TEST_USERS.length === 0) {
  console.warn('⚠️  No K6_TEST_USER_EMAIL_* environment variables found. Using default test users for local testing only.');
  TEST_USERS.push(
    { email: 'loadtest1@artifio.ai', password: 'LoadTest123!' },
    { email: 'loadtest2@artifio.ai', password: 'LoadTest123!' },
    { email: 'loadtest3@artifio.ai', password: 'LoadTest123!' }
  );
}

console.log(`Loaded ${TEST_USERS.length} test users for load testing`);

const PROMPTS = [
  'A beautiful sunset over mountains',
  'Modern minimalist interior design',
  'Futuristic city skyline at night',
  'Abstract geometric patterns',
  'Realistic portrait of a person',
];

// Main test function (runs for each virtual user)
export default function () {
  // Select random test user
  const user = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
  let authToken = null;

  // === GROUP 1: Authentication ===
  group('Authentication', () => {
    const loginRes = http.post(`${API_BASE}/auth/login`, JSON.stringify({
      email: user.email,
      password: user.password,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

    const loginSuccess = check(loginRes, {
      'login status is 200': (r) => r.status === 200,
      'login returns token': (r) => r.json('access_token') !== undefined,
    });

    if (loginSuccess) {
      authToken = loginRes.json('access_token');
    } else {
      errorRate.add(1);
      apiErrors.add(1);
      console.error(`Login failed: ${loginRes.status} ${loginRes.body}`);
      return; // Exit if login fails
    }

    sleep(1); // Think time
  });

  // === GROUP 2: Browse Templates ===
  group('Browse Templates', () => {
    const templatesRes = http.get(`${API_BASE}/templates`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    check(templatesRes, {
      'templates status is 200': (r) => r.status === 200,
      'templates response time < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);

    sleep(2); // Browse time
  });

  // === GROUP 3: Generate Image ===
  group('Generate Image', () => {
    const prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    const startTime = Date.now();

    const generateRes = http.post(`${API_BASE}/generate-content`, JSON.stringify({
      prompt: prompt,
      model_id: 'runware-flux',
      num_outputs: 1,
    }), {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    const generateSuccess = check(generateRes, {
      'generation status is 200 or 202': (r) => r.status === 200 || r.status === 202,
      'generation returns job_id': (r) => r.json('generation_id') !== undefined,
    });

    if (!generateSuccess) {
      errorRate.add(1);
      apiErrors.add(1);
      generationSuccess.add(0);
      return;
    }

    const generationId = generateRes.json('generation_id');

    // Poll for completion (max 60 seconds)
    let completed = false;
    let attempts = 0;
    const maxAttempts = 12; // 12 * 5s = 60s

    while (!completed && attempts < maxAttempts) {
      sleep(5); // Wait 5 seconds between polls

      const statusRes = http.get(`${API_BASE}/generation/${generationId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (statusRes.status === 200) {
        const status = statusRes.json('status');
        if (status === 'completed') {
          completed = true;
          const duration = Date.now() - startTime;
          generationDuration.add(duration);
          generationSuccess.add(1);
        } else if (status === 'failed') {
          errorRate.add(1);
          generationSuccess.add(0);
          break;
        }
      }

      attempts++;
    }

    if (!completed) {
      // Timeout
      errorRate.add(1);
      generationSuccess.add(0);
    }
  });

  // === GROUP 4: View History ===
  group('View History', () => {
    const historyRes = http.get(`${API_BASE}/generations?limit=10`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    check(historyRes, {
      'history status is 200': (r) => r.status === 200,
      'history response time < 1s': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);

    sleep(2);
  });

  // === GROUP 5: Check Credits ===
  group('Check Credits', () => {
    const creditsRes = http.get(`${API_BASE}/user-tokens`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    check(creditsRes, {
      'credits status is 200': (r) => r.status === 200,
      'credits response time < 200ms': (r) => r.timings.duration < 200,
    }) || errorRate.add(1);
  });

  // Random think time between 3-7 seconds
  sleep(Math.random() * 4 + 3);
}

// Setup function (runs once at start)
export function setup() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  Artifio.ai - 10K Concurrent Users Load Test              ║
╠════════════════════════════════════════════════════════════╣
║  Base URL: ${BASE_URL}                                      ║
║  Target: 10,000 concurrent users                          ║
║  Duration: 25 minutes (10 min peak)                       ║
║  Success Criteria:                                         ║
║    - p95 response time < 3s                               ║
║    - Error rate < 1%                                      ║
║    - Generation success > 99%                             ║
╚════════════════════════════════════════════════════════════╝
  `);

  // Verify API is reachable
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    console.error('❌ API health check failed! Aborting test.');
    return null;
  }

  console.log('✅ API health check passed. Starting load test...\n');
  return { startTime: Date.now() };
}

// Teardown function (runs once at end)
export function teardown(data) {
  if (!data) return;

  const duration = (Date.now() - data.startTime) / 1000 / 60;
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  Load Test Completed                                       ║
╠════════════════════════════════════════════════════════════╣
║  Duration: ${duration.toFixed(2)} minutes                            ║
║  Check detailed metrics above for pass/fail status        ║
╚════════════════════════════════════════════════════════════╝
  `);
}
