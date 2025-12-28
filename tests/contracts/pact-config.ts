/**
 * Pact Configuration
 * Consumer-driven contract testing setup
 */

import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';

// Pact configuration for consumer tests
export const pactConfig = {
  consumer: 'ExchangeApp',
  provider: 'ApiGateway',
  logDir: path.resolve(process.cwd(), 'tests/contracts/logs'),
  pactDir: path.resolve(process.cwd(), 'tests/contracts/pacts'),
  logLevel: 'warn' as const,
};

// Create a new Pact instance for consumer tests
export function createPact(provider: string = 'ApiGateway'): PactV3 {
  return new PactV3({
    consumer: pactConfig.consumer,
    provider,
    dir: pactConfig.pactDir,
  });
}

// Common matchers for API responses
export const matchers = {
  uuid: MatchersV3.uuid(),
  email: MatchersV3.email(),
  timestamp: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX"),
  isoDate: MatchersV3.date('yyyy-MM-dd'),
  decimal: MatchersV3.decimal(0.0),
  integer: MatchersV3.integer(0),
  boolean: MatchersV3.boolean(true),
  
  // Custom matchers
  price: MatchersV3.regex(/^\d+\.\d{2,8}$/, '45000.00'),
  quantity: MatchersV3.regex(/^\d+\.\d{1,8}$/, '0.5'),
  orderSide: MatchersV3.regex(/^(buy|sell)$/, 'buy'),
  orderType: MatchersV3.regex(/^(limit|market|stop_limit|stop_loss)$/, 'limit'),
  orderStatus: MatchersV3.regex(/^(open|filled|partial|cancelled)$/, 'open'),
};

// Common headers
export const headers = {
  json: { 'Content-Type': 'application/json' },
  auth: (token: string) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }),
};

// Sample data factories
export const factories = {
  user: () => ({
    id: MatchersV3.uuid('user-123'),
    email: MatchersV3.email('user@example.com'),
    username: MatchersV3.string('testuser'),
    kycLevel: MatchersV3.integer(0),
    createdAt: matchers.timestamp,
  }),

  order: () => ({
    id: MatchersV3.uuid('order-123'),
    userId: MatchersV3.uuid('user-123'),
    symbol: MatchersV3.string('BTCUSDT'),
    side: matchers.orderSide,
    type: matchers.orderType,
    status: matchers.orderStatus,
    price: matchers.price,
    quantity: matchers.quantity,
    filledQuantity: matchers.quantity,
    createdAt: matchers.timestamp,
  }),

  wallet: () => ({
    id: MatchersV3.uuid('wallet-123'),
    userId: MatchersV3.uuid('user-123'),
    currency: MatchersV3.string('BTC'),
    available: matchers.decimal,
    locked: matchers.decimal,
  }),

  authTokens: () => ({
    accessToken: MatchersV3.string('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
    refreshToken: MatchersV3.string('refresh-token-here'),
    expiresIn: MatchersV3.integer(900),
    tokenType: MatchersV3.string('Bearer'),
  }),
};
