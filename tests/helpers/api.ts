/**
 * Test Helpers for API Testing
 * Provides utilities for making HTTP requests and assertions
 */

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

export interface TestContext {
  app: INestApplication;
  module: TestingModule;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Create a test application from the given module
 */
export async function createTestApp(AppModule: any): Promise<TestContext> {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = module.createNestApplication();
  await app.init();

  return { app, module };
}

/**
 * Close test application and cleanup
 */
export async function closeTestApp(context: TestContext): Promise<void> {
  await context.app.close();
}

/**
 * Helper class for making authenticated API requests
 */
export class ApiClient {
  private tokens: AuthTokens | null = null;

  constructor(private readonly app: INestApplication) {}

  setTokens(tokens: AuthTokens): void {
    this.tokens = tokens;
  }

  clearTokens(): void {
    this.tokens = null;
  }

  get(path: string) {
    const req = request(this.app.getHttpServer()).get(path);
    if (this.tokens) {
      req.set('Authorization', `Bearer ${this.tokens.accessToken}`);
    }
    return req;
  }

  post(path: string, body?: any) {
    const req = request(this.app.getHttpServer()).post(path);
    if (this.tokens) {
      req.set('Authorization', `Bearer ${this.tokens.accessToken}`);
    }
    if (body) {
      req.send(body);
    }
    return req;
  }

  put(path: string, body?: any) {
    const req = request(this.app.getHttpServer()).put(path);
    if (this.tokens) {
      req.set('Authorization', `Bearer ${this.tokens.accessToken}`);
    }
    if (body) {
      req.send(body);
    }
    return req;
  }

  patch(path: string, body?: any) {
    const req = request(this.app.getHttpServer()).patch(path);
    if (this.tokens) {
      req.set('Authorization', `Bearer ${this.tokens.accessToken}`);
    }
    if (body) {
      req.send(body);
    }
    return req;
  }

  delete(path: string) {
    const req = request(this.app.getHttpServer()).delete(path);
    if (this.tokens) {
      req.set('Authorization', `Bearer ${this.tokens.accessToken}`);
    }
    return req;
  }
}

/**
 * Generate a random email for testing
 */
export function generateTestEmail(): string {
  const randomId = Math.random().toString(36).substring(7);
  return `test-${randomId}@example.com`;
}

/**
 * Generate a random username for testing
 */
export function generateTestUsername(): string {
  const randomId = Math.random().toString(36).substring(7);
  return `testuser_${randomId}`;
}

/**
 * Generate a secure test password
 */
export function generateTestPassword(): string {
  return `Test@${Math.random().toString(36).substring(2, 10)}123`;
}

/**
 * Wait for a condition or timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeoutMs = 5000,
  intervalMs = 100,
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  return false;
}

/**
 * Retry a function multiple times before failing
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000,
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError;
}
