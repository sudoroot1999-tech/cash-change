/**
 * k6 Configuration
 * Shared configuration and helper functions for load tests
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Environment configuration
export const config = {
  baseUrl: __ENV.BASE_URL || 'http://localhost:3000/api/v1',
  wsUrl: __ENV.WS_URL || 'ws://localhost:3000/ws',
};

// Custom metrics
export const errorRate = new Rate('errors');
export const requestCount = new Counter('requests');
export const latency = new Trend('response_time');

// Default options for load tests
export const defaultOptions = {
  // Smoke test
  smoke: {
    vus: 1,
    duration: '1m',
    thresholds: {
      http_req_duration: ['p(95)<500'],
      errors: ['rate<0.01'],
    },
  },
  
  // Load test
  load: {
    stages: [
      { duration: '2m', target: 50 },   // Ramp up
      { duration: '5m', target: 50 },   // Stay at 50 users
      { duration: '2m', target: 100 },  // Ramp up more
      { duration: '5m', target: 100 },  // Stay at 100 users
      { duration: '2m', target: 0 },    // Ramp down
    ],
    thresholds: {
      http_req_duration: ['p(95)<1000', 'p(99)<2000'],
      errors: ['rate<0.05'],
    },
  },
  
  // Stress test
  stress: {
    stages: [
      { duration: '2m', target: 100 },
      { duration: '5m', target: 100 },
      { duration: '2m', target: 200 },
      { duration: '5m', target: 200 },
      { duration: '2m', target: 300 },
      { duration: '5m', target: 300 },
      { duration: '5m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<2000'],
      errors: ['rate<0.1'],
    },
  },
  
  // Spike test
  spike: {
    stages: [
      { duration: '1m', target: 10 },
      { duration: '30s', target: 500 },  // Sudden spike
      { duration: '1m', target: 500 },
      { duration: '30s', target: 10 },   // Quick drop
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<3000'],
      errors: ['rate<0.15'],
    },
  },
};

// Helper functions
export function jsonHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function randomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function randomEmail() {
  return `loadtest-${randomString(8)}@test.com`;
}

export function randomPrice(min, max) {
  return (Math.random() * (max - min) + min).toFixed(2);
}

export function randomQuantity(min, max) {
  return (Math.random() * (max - min) + min).toFixed(8);
}

// Test user management
const testUsers = [];

export function registerUser() {
  const email = randomEmail();
  const password = 'LoadTest123!';
  
  const res = http.post(
    `${config.baseUrl}/auth/register`,
    JSON.stringify({ email, password }),
    { headers: jsonHeaders() }
  );
  
  if (res.status === 201) {
    const data = res.json();
    testUsers.push({
      email,
      password,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    return data.accessToken;
  }
  
  return null;
}

export function loginUser(email, password) {
  const res = http.post(
    `${config.baseUrl}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: jsonHeaders() }
  );
  
  if (res.status === 200) {
    return res.json().accessToken;
  }
  
  return null;
}

export function checkResponse(res, expectedStatus = 200) {
  const success = check(res, {
    [`status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!success);
  requestCount.add(1);
  latency.add(res.timings.duration);
  
  return success;
}
