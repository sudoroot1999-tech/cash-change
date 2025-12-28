/**
 * Auth Service Test Setup
 */

import 'reflect-metadata';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_DAYS = '7';

// Mock common dependencies
jest.mock('@otplib/preset-default', () => ({
  authenticator: {
    generateSecret: jest.fn().mockReturnValue('TESTSECRET123456'),
    keyuri: jest.fn().mockReturnValue('otpauth://totp/CryptoExchange:test@example.com?secret=TESTSECRET123456'),
    verify: jest.fn(),
  },
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockqrcode'),
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    expire: jest.fn(),
    disconnect: jest.fn(),
    quit: jest.fn(),
  }));
});
