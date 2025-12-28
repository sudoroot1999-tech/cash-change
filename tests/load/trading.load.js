/**
 * k6 Trading Load Tests
 * Performance testing for order and trading endpoints
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend } from 'k6/metrics';
import { config, jsonHeaders, randomPrice, randomQuantity, checkResponse, defaultOptions } from './k6-config.js';

// Test options
const testType = __ENV.TEST_TYPE || 'smoke';
export const options = defaultOptions[testType];

// Custom metrics for trading
const orderPlacementTime = new Trend('order_placement_time');
const orderCancelTime = new Trend('order_cancel_time');

// Test data
const testPassword = 'LoadTest123!';
let userToken = null;
let createdOrders = [];

export function setup() {
  // Create test user for trading
  const email = `trading-${Date.now()}@test.com`;
  
  const registerRes = http.post(
    `${config.baseUrl}/auth/register`,
    JSON.stringify({ email, password: testPassword }),
    { headers: jsonHeaders() }
  );
  
  if (registerRes.status === 201) {
    const data = registerRes.json();
    return {
      token: data.accessToken,
      email,
    };
  }
  
  // Try login if registration fails (user might exist)
  const loginRes = http.post(
    `${config.baseUrl}/auth/login`,
    JSON.stringify({ email, password: testPassword }),
    { headers: jsonHeaders() }
  );
  
  if (loginRes.status === 200) {
    return {
      token: loginRes.json().accessToken,
      email,
    };
  }
  
  return { token: null, email: null };
}

export default function(data) {
  if (!data.token) {
    console.log('No auth token available, skipping trading tests');
    return;
  }
  
  userToken = data.token;
  
  group('Trading Load Tests', function() {
    
    group('Get Order Book', function() {
      const res = http.get(
        `${config.baseUrl}/market/orderbook/BTCUSDT`,
        { headers: jsonHeaders(userToken) }
      );
      
      check(res, {
        'orderbook retrieved': (r) => r.status === 200,
        'has bids and asks': (r) => {
          if (r.status === 200) {
            const data = r.json();
            return data.bids !== undefined && data.asks !== undefined;
          }
          return true;
        },
        'response time < 100ms': (r) => r.timings.duration < 100,
      });
      
      checkResponse(res, res.status);
      sleep(0.1);
    });
    
    group('Get Recent Trades', function() {
      const res = http.get(
        `${config.baseUrl}/market/trades/BTCUSDT`,
        { headers: jsonHeaders(userToken) }
      );
      
      check(res, {
        'trades retrieved': (r) => r.status === 200,
        'response time < 100ms': (r) => r.timings.duration < 100,
      });
      
      checkResponse(res, res.status);
      sleep(0.1);
    });
    
    group('Get Ticker', function() {
      const res = http.get(
        `${config.baseUrl}/market/ticker/BTCUSDT`,
        { headers: jsonHeaders(userToken) }
      );
      
      check(res, {
        'ticker retrieved': (r) => r.status === 200,
        'has price': (r) => r.status !== 200 || r.json().lastPrice !== undefined,
        'response time < 50ms': (r) => r.timings.duration < 50,
      });
      
      checkResponse(res, res.status);
      sleep(0.1);
    });
    
    group('Place Limit Order', function() {
      const price = randomPrice(40000, 50000);
      const quantity = randomQuantity(0.001, 0.01);
      
      const startTime = Date.now();
      
      const res = http.post(
        `${config.baseUrl}/orders`,
        JSON.stringify({
          symbol: 'BTCUSDT',
          side: Math.random() > 0.5 ? 'buy' : 'sell',
          type: 'limit',
          price,
          quantity,
          timeInForce: 'GTC',
        }),
        { headers: jsonHeaders(userToken) }
      );
      
      orderPlacementTime.add(Date.now() - startTime);
      
      const success = check(res, {
        'order created': (r) => r.status === 201 || r.status === 400,
        'has order id': (r) => r.status !== 201 || r.json().id !== undefined,
        'response time < 500ms': (r) => r.timings.duration < 500,
      });
      
      if (res.status === 201) {
        const order = res.json();
        createdOrders.push(order.id);
      }
      
      checkResponse(res, res.status);
      sleep(0.2);
    });
    
    group('Get User Orders', function() {
      const res = http.get(
        `${config.baseUrl}/orders?status=open&limit=10`,
        { headers: jsonHeaders(userToken) }
      );
      
      check(res, {
        'orders retrieved': (r) => r.status === 200,
        'is array': (r) => r.status !== 200 || Array.isArray(r.json().items || r.json()),
        'response time < 200ms': (r) => r.timings.duration < 200,
      });
      
      checkResponse(res, res.status);
      sleep(0.2);
    });
    
    group('Cancel Order', function() {
      if (createdOrders.length === 0) {
        return;
      }
      
      const orderId = createdOrders.pop();
      const startTime = Date.now();
      
      const res = http.del(
        `${config.baseUrl}/orders/${orderId}`,
        null,
        { headers: jsonHeaders(userToken) }
      );
      
      orderCancelTime.add(Date.now() - startTime);
      
      check(res, {
        'order cancelled': (r) => r.status === 200 || r.status === 404,
        'response time < 300ms': (r) => r.timings.duration < 300,
      });
      
      checkResponse(res, res.status);
      sleep(0.2);
    });
    
    group('Get Trade History', function() {
      const res = http.get(
        `${config.baseUrl}/trades?limit=20`,
        { headers: jsonHeaders(userToken) }
      );
      
      check(res, {
        'trades retrieved': (r) => r.status === 200,
        'response time < 200ms': (r) => r.timings.duration < 200,
      });
      
      checkResponse(res, res.status);
      sleep(0.2);
    });
  });
  
  sleep(1);
}

export function teardown(data) {
  // Cancel any remaining orders
  if (createdOrders.length > 0 && data.token) {
    createdOrders.forEach((orderId) => {
      http.del(
        `${config.baseUrl}/orders/${orderId}`,
        null,
        { headers: jsonHeaders(data.token) }
      );
    });
  }
  
  console.log(`Trading load test completed for ${testType} profile`);
}
