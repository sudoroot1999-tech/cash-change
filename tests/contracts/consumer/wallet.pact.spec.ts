/**
 * Wallet API Consumer Contract Tests
 * Defines expected wallet API behavior from the frontend's perspective
 */

import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { createPact, headers, factories, matchers } from '../pact-config';

describe('Wallet API Consumer Contract', () => {
  let pact: PactV3;

  beforeAll(() => {
    pact = createPact('ApiGateway');
  });

  describe('GET /api/v1/wallet/balances', () => {
    it('should get all wallet balances', async () => {
      await pact
        .given('user is authenticated with wallets')
        .uponReceiving('a request to get wallet balances')
        .withRequest({
          method: 'GET',
          path: '/api/v1/wallet/balances',
          headers: headers.auth('valid-token'),
        })
        .willRespondWith({
          status: 200,
          headers: headers.json,
          body: MatchersV3.eachLike({
            currency: MatchersV3.string('BTC'),
            available: matchers.decimal,
            locked: matchers.decimal,
            total: matchers.decimal,
          }),
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/wallet/balances`, {
            headers: headers.auth('valid-token'),
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data).toBeInstanceOf(Array);
        });
    });
  });

  describe('GET /api/v1/wallet/balances/:currency', () => {
    it('should get balance for specific currency', async () => {
      await pact
        .given('user has BTC balance')
        .uponReceiving('a request to get BTC balance')
        .withRequest({
          method: 'GET',
          path: '/api/v1/wallet/balances/BTC',
          headers: headers.auth('valid-token'),
        })
        .willRespondWith({
          status: 200,
          headers: headers.json,
          body: {
            currency: MatchersV3.string('BTC'),
            available: matchers.decimal,
            locked: matchers.decimal,
            total: matchers.decimal,
          },
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/wallet/balances/BTC`, {
            headers: headers.auth('valid-token'),
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data.currency).toBe('BTC');
        });
    });
  });

  describe('POST /api/v1/wallet/deposit/address', () => {
    it('should generate deposit address', async () => {
      await pact
        .given('user is authenticated')
        .uponReceiving('a request to generate deposit address')
        .withRequest({
          method: 'POST',
          path: '/api/v1/wallet/deposit/address',
          headers: headers.auth('valid-token'),
          body: {
            currency: 'BTC',
            network: 'bitcoin',
          },
        })
        .willRespondWith({
          status: 201,
          headers: headers.json,
          body: {
            currency: MatchersV3.string('BTC'),
            network: MatchersV3.string('bitcoin'),
            address: MatchersV3.regex(/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/, 'bc1qtest123'),
            memo: MatchersV3.like(null),
          },
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/wallet/deposit/address`, {
            method: 'POST',
            headers: headers.auth('valid-token'),
            body: JSON.stringify({ currency: 'BTC', network: 'bitcoin' }),
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          expect(data.address).toBeDefined();
        });
    });
  });

  describe('POST /api/v1/wallet/withdraw', () => {
    it('should create withdrawal request', async () => {
      await pact
        .given('user has sufficient BTC balance')
        .uponReceiving('a request to withdraw BTC')
        .withRequest({
          method: 'POST',
          path: '/api/v1/wallet/withdraw',
          headers: headers.auth('valid-token'),
          body: {
            currency: 'BTC',
            amount: '0.01',
            address: 'bc1qtest123',
            network: 'bitcoin',
          },
        })
        .willRespondWith({
          status: 201,
          headers: headers.json,
          body: {
            id: MatchersV3.uuid(),
            currency: MatchersV3.string('BTC'),
            amount: matchers.decimal,
            fee: matchers.decimal,
            address: MatchersV3.string('bc1qtest123'),
            status: MatchersV3.string('pending'),
            createdAt: matchers.timestamp,
          },
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/wallet/withdraw`, {
            method: 'POST',
            headers: headers.auth('valid-token'),
            body: JSON.stringify({
              currency: 'BTC',
              amount: '0.01',
              address: 'bc1qtest123',
              network: 'bitcoin',
            }),
          });

          expect(response.status).toBe(201);
        });
    });

    it('should return 400 for insufficient balance', async () => {
      await pact
        .given('user has insufficient balance')
        .uponReceiving('a withdrawal request with insufficient funds')
        .withRequest({
          method: 'POST',
          path: '/api/v1/wallet/withdraw',
          headers: headers.auth('valid-token'),
          body: {
            currency: 'BTC',
            amount: '1000',
            address: 'bc1qtest123',
            network: 'bitcoin',
          },
        })
        .willRespondWith({
          status: 400,
          headers: headers.json,
          body: {
            error: 'BadRequest',
            message: MatchersV3.string('Insufficient balance'),
          },
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/wallet/withdraw`, {
            method: 'POST',
            headers: headers.auth('valid-token'),
            body: JSON.stringify({
              currency: 'BTC',
              amount: '1000',
              address: 'bc1qtest123',
              network: 'bitcoin',
            }),
          });

          expect(response.status).toBe(400);
        });
    });
  });

  describe('GET /api/v1/wallet/deposits', () => {
    it('should get deposit history', async () => {
      await pact
        .given('user has deposit history')
        .uponReceiving('a request to get deposit history')
        .withRequest({
          method: 'GET',
          path: '/api/v1/wallet/deposits',
          headers: headers.auth('valid-token'),
        })
        .willRespondWith({
          status: 200,
          headers: headers.json,
          body: {
            items: MatchersV3.eachLike({
              id: MatchersV3.uuid(),
              currency: MatchersV3.string('BTC'),
              amount: matchers.decimal,
              txHash: MatchersV3.string('0x...'),
              status: MatchersV3.regex(/pending|confirmed|failed/, 'confirmed'),
              createdAt: matchers.timestamp,
            }),
            total: MatchersV3.integer(1),
          },
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/wallet/deposits`, {
            headers: headers.auth('valid-token'),
          });

          expect(response.status).toBe(200);
        });
    });
  });

  describe('GET /api/v1/wallet/withdrawals', () => {
    it('should get withdrawal history', async () => {
      await pact
        .given('user has withdrawal history')
        .uponReceiving('a request to get withdrawal history')
        .withRequest({
          method: 'GET',
          path: '/api/v1/wallet/withdrawals',
          headers: headers.auth('valid-token'),
        })
        .willRespondWith({
          status: 200,
          headers: headers.json,
          body: {
            items: MatchersV3.eachLike({
              id: MatchersV3.uuid(),
              currency: MatchersV3.string('BTC'),
              amount: matchers.decimal,
              fee: matchers.decimal,
              address: MatchersV3.string('bc1q...'),
              txHash: MatchersV3.like('0x...'),
              status: MatchersV3.regex(/pending|processing|completed|failed/, 'completed'),
              createdAt: matchers.timestamp,
            }),
            total: MatchersV3.integer(1),
          },
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/wallet/withdrawals`, {
            headers: headers.auth('valid-token'),
          });

          expect(response.status).toBe(200);
        });
    });
  });
});
