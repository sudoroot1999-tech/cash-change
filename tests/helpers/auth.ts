/**
 * Authentication Test Helpers
 * Utilities for testing authentication flows
 */

import * as jwt from 'jsonwebtoken';

export interface TestUser {
  id: string;
  email: string;
  username: string;
  password: string;
  role?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

const TEST_JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
const TEST_JWT_EXPIRES_IN = '1h';

/**
 * Generate a test JWT token
 */
export function generateTestToken(user: Partial<TestUser>): string {
  const payload: Partial<JwtPayload> = {
    sub: user.id || 'test-user-id',
    email: user.email || 'test@example.com',
    username: user.username || 'testuser',
    role: user.role || 'user',
  };

  return jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: TEST_JWT_EXPIRES_IN });
}

/**
 * Generate an expired test token
 */
export function generateExpiredToken(user: Partial<TestUser>): string {
  const payload: Partial<JwtPayload> = {
    sub: user.id || 'test-user-id',
    email: user.email || 'test@example.com',
    username: user.username || 'testuser',
    role: user.role || 'user',
  };

  return jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '-1h' });
}

/**
 * Generate an admin token for testing
 */
export function generateAdminToken(): string {
  return generateTestToken({
    id: 'admin-user-id',
    email: 'admin@example.com',
    username: 'admin',
    role: 'admin',
  });
}

/**
 * Decode a JWT token without verification
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, TEST_JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Create test user data
 */
export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  const id = Math.random().toString(36).substring(7);
  return {
    id: `user-${id}`,
    email: `test-${id}@example.com`,
    username: `user_${id}`,
    password: `Password@${id}123`,
    role: 'user',
    ...overrides,
  };
}

/**
 * Create multiple test users
 */
export function createTestUsers(count: number): TestUser[] {
  return Array.from({ length: count }, () => createTestUser());
}

/**
 * Hash password for testing (simplified)
 */
export async function hashPassword(password: string): Promise<string> {
  // In real tests, use bcrypt. This is a simplified version.
  const bcrypt = await import('bcrypt');
  return bcrypt.hash(password, 10);
}

/**
 * Compare password for testing
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcrypt');
  return bcrypt.compare(password, hash);
}
