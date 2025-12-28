/**
 * Auth API Consumer Contract Tests
 * Defines expected API behavior from the frontend's perspective
 */

import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { createPact, headers, factories, matchers } from '../pact-config';

describe('Auth API Consumer Contract', () => {
  let pact: PactV3;

  beforeAll(() => {
    pact = createPact('ApiGateway');
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return tokens', async () => {
      // Define the expected interaction
      await pact
        .given('no user exists with email test@example.com')
        .uponReceiving('a request to register a new user')
        .withRequest({
          method: 'POST',
          path: '/api/v1/auth/register',
          headers: headers.json,
          body: {
            email: 'test@example.com',
            password: 'SecureP@ss123!',
          },
        })
        .willRespondWith({
          status: 201,
          headers: headers.json,
          body: factories.authTokens(),
        })
        .executeTest(async (mockServer) => {
          // Consumer code would call this endpoint
          const response = await fetch(`${mockServer.url}/api/v1/auth/register`, {
            method: 'POST',
            headers: headers.json,
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'SecureP@ss123!',
            }),
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          expect(data.accessToken).toBeDefined();
          expect(data.refreshToken).toBeDefined();
        });
    });

    it('should return 409 for duplicate email', async () => {
      await pact
        .given('a user exists with email existing@example.com')
        .uponReceiving('a request to register with existing email')
        .withRequest({
          method: 'POST',
          path: '/api/v1/auth/register',
          headers: headers.json,
          body: {
            email: 'existing@example.com',
            password: 'SecureP@ss123!',
          },
        })
        .willRespondWith({
          status: 409,
          headers: headers.json,
          body: {
            error: 'Conflict',
            message: MatchersV3.string('Email already registered'),
          },
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/auth/register`, {
            method: 'POST',
            headers: headers.json,
            body: JSON.stringify({
              email: 'existing@example.com',
              password: 'SecureP@ss123!',
            }),
          });

          expect(response.status).toBe(409);
        });
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      await pact
        .given('user exists with email user@example.com and password')
        .uponReceiving('a request to login with valid credentials')
        .withRequest({
          method: 'POST',
          path: '/api/v1/auth/login',
          headers: headers.json,
          body: {
            email: 'user@example.com',
            password: 'ValidPassword123!',
          },
        })
        .willRespondWith({
          status: 200,
          headers: headers.json,
          body: factories.authTokens(),
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/auth/login`, {
            method: 'POST',
            headers: headers.json,
            body: JSON.stringify({
              email: 'user@example.com',
              password: 'ValidPassword123!',
            }),
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data.accessToken).toBeDefined();
        });
    });

    it('should return 401 for invalid credentials', async () => {
      await pact
        .given('user exists with email user@example.com')
        .uponReceiving('a request to login with wrong password')
        .withRequest({
          method: 'POST',
          path: '/api/v1/auth/login',
          headers: headers.json,
          body: {
            email: 'user@example.com',
            password: 'WrongPassword!',
          },
        })
        .willRespondWith({
          status: 401,
          headers: headers.json,
          body: {
            error: 'Unauthorized',
            message: MatchersV3.string('Invalid credentials'),
          },
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/auth/login`, {
            method: 'POST',
            headers: headers.json,
            body: JSON.stringify({
              email: 'user@example.com',
              password: 'WrongPassword!',
            }),
          });

          expect(response.status).toBe(401);
        });
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      await pact
        .given('valid refresh token exists')
        .uponReceiving('a request to refresh tokens')
        .withRequest({
          method: 'POST',
          path: '/api/v1/auth/refresh',
          headers: headers.json,
          body: {
            refreshToken: 'valid-refresh-token',
          },
        })
        .willRespondWith({
          status: 200,
          headers: headers.json,
          body: factories.authTokens(),
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: headers.json,
            body: JSON.stringify({ refreshToken: 'valid-refresh-token' }),
          });

          expect(response.status).toBe(200);
        });
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout and invalidate session', async () => {
      await pact
        .given('user is authenticated')
        .uponReceiving('a request to logout')
        .withRequest({
          method: 'POST',
          path: '/api/v1/auth/logout',
          headers: headers.auth('valid-token'),
          body: {
            refreshToken: 'valid-refresh-token',
          },
        })
        .willRespondWith({
          status: 200,
          headers: headers.json,
          body: {
            message: MatchersV3.string('Logged out successfully'),
          },
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/auth/logout`, {
            method: 'POST',
            headers: headers.auth('valid-token'),
            body: JSON.stringify({ refreshToken: 'valid-refresh-token' }),
          });

          expect(response.status).toBe(200);
        });
    });
  });
});
