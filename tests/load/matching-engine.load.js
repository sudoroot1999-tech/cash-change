/**
 * k6 Matching Engine Load Tests
 * High-performance testing for the order matching engine
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';
import { config, jsonHeaders, randomPrice, randomQuantity } from './k6-config.js';

// Custom metrics for matching engine
const ordersPerSecond = new Counter('orders_per_second');
const matchLatency = new Trend('match_latency');
const matchSuccessRate = new Rate('match_success');

// High-load options for matching engine stress test
export const options = {
  scenarios: {
    // Constant arrival rate for consistent order flow
    constant_orders: {
      executor: 'constant-arrival-rate',
      rate: 100, // 100 orders per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
    
    // Ramping for burst testing
    ramping_orders: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      stages: [
        { target: 100, duration: '2m' },
        { target: 500, duration: '3m' },
        { target: 1000, duration: '2m' },
        { target: 100, duration: '1m' },
      ],
      preAllocatedVUs: 100,
      maxVUs: 500,
    },
  },
  
  thresholds: {
    match_latency: ['p(50)<10', 'p(95)<50', 'p(99)<100'],
    match_success: ['rate>0.99'],
    orders_per_second: ['count>10000'],
    http_req_duration: ['p(95)<100'],
  },
};

// Shared state
let tokens = [];
const tradingPairs = ['BTCUSDT', 'ETHUSDT', 'ETHBTC', 'LINKUSDT', 'ADAUSDT'];

export function setup() {
  // Create multiple test users for parallel order submission
  const userCount = 10;
  const createdTokens = [];
  
  for (let i = 0; i < userCount; i++) {
    const email = `matchtest-${i}-${Date.now()}@test.com`;
    
    const res = http.post(
      `${config.baseUrl}/auth/register`,
      JSON.stringify({ email, password: 'MatchTest123!' }),
      { headers: jsonHeaders() }
    );
    
    if (res.status === 201) {
      createdTokens.push(res.json().accessToken);
    }
  }
  
  return { tokens: createdTokens };
}

export default function(data) {
  if (!data.tokens || data.tokens.length === 0) {
    console.log('No tokens available');
    return;
  }
  
  // Pick random user token
  const token = data.tokens[Math.floor(Math.random() * data.tokens.length)];
  
  // Pick random trading pair
  const symbol = tradingPairs[Math.floor(Math.random() * tradingPairs.length)];
  
  // Generate order parameters
  const side = Math.random() > 0.5 ? 'buy' : 'sell';
  const type = Math.random() > 0.9 ? 'market' : 'limit';
  const price = randomPrice(40000, 50000);
  const quantity = randomQuantity(0.001, 0.1);
  
  const orderPayload = {
    symbol,
    side,
    type,
    quantity,
    timeInForce: 'GTC',
  };
  
  // Only include price for limit orders
  if (type === 'limit') {
    orderPayload.price = price;
  }
  
  const startTime = Date.now();
  
  const res = http.post(
    `${config.baseUrl}/orders`,
    JSON.stringify(orderPayload),
    { headers: jsonHeaders(token) }
  );
  
  const latency = Date.now() - startTime;
  matchLatency.add(latency);
  ordersPerSecond.add(1);
  
  const success = check(res, {
    'order processed': (r) => r.status === 201 || r.status === 400,
    'fast response': (r) => r.timings.duration < 100,
  });
  
  matchSuccessRate.add(res.status === 201);
  
  // Minimal sleep to maintain high order rate
  sleep(0.01);
}

export function teardown(data) {
  console.log('Matching engine load test completed');
  console.log(`Tested with ${data.tokens?.length || 0} concurrent users`);
}
