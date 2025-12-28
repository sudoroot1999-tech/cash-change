/**
 * Trading API Consumer Contract Tests
 * Defines expected trading API behavior from the frontend's perspective  
 */

import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { createPact, headers, factories, matchers } from '../pact-config';

describe('Trading API Consumer Contract', () => {
  let pact: PactV3;

  beforeAll(() => {
    pact = createPact('ApiGateway');
  });

  describe('POST /api/v1/orders', () => {
    it('should create a limit buy order', async () => {
      await pact
        .given('user is authenticated with sufficient balance')
        .uponReceiving('a request to create a limit buy order')
        .withRequest({
          method: 'POST',
          path: '/api/v1/orders',
          headers: headers.auth('valid-token'),
          body: {
            symbol: 'BTCUSDT',
            side: 'buy',
            type: 'limit',
            price: '45000.00',
            quantity: '0.1',
            timeInForce: 'GTC',
          },
        })
        .willRespondWith({
          status: 201,
          headers: headers.json,
          body: {
            id: MatchersV3.uuid(),
            symbol: MatchersV3.string('BTCUSDT'),
            side: MatchersV3.string('buy'),
            type: MatchersV3.string('limit'),
            status: MatchersV3.string('open'),
            price: matchers.price,
            quantity: matchers.quantity,
            filledQuantity: MatchersV3.string('0'),
            createdAt: matchers.timestamp,
          },
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/orders`, {
            method: 'POST',
            headers: headers.auth('valid-token'),
            body: JSON.stringify({
              symbol: 'BTCUSDT',
              side: 'buy',
              type: 'limit',
              price: '45000.00',
              quantity: '0.1',
              timeInForce: 'GTC',
            }),
          });

          expect(response.status).toBe(201);
          const data = await response.json();
          expect(data.id).toBeDefined();
          expect(data.status).toBe('open');
        });
    });

    it('should create a market sell order', async () => {
      await pact
        .given('user is authenticated with BTC balance')
        .uponReceiving('a request to create a market sell order')
        .withRequest({
          method: 'POST',
          path: '/api/v1/orders',
          headers: headers.auth('valid-token'),
          body: {
            symbol: 'BTCUSDT',
            side: 'sell',
            type: 'market',
            quantity: '0.1',
          },
        })
        .willRespondWith({
          status: 201,
          headers: headers.json,
          body: {
            id: MatchersV3.uuid(),
            symbol: MatchersV3.string('BTCUSDT'),
            side: MatchersV3.string('sell'),
            type: MatchersV3.string('market'),
            status: MatchersV3.regex(/open|filled/, 'filled'),
            quantity: matchers.quantity,
            filledQuantity: matchers.quantity,
            createdAt: matchers.timestamp,
          },
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/orders`, {
            method: 'POST',
            headers: headers.auth('valid-token'),
            body: JSON.stringify({
              symbol: 'BTCUSDT',
              side: 'sell',
              type: 'market',
              quantity: '0.1',
            }),
          });

          expect(response.status).toBe(201);
        });
    });

    it('should return 400 for insufficient balance', async () => {
      await pact
        .given('user is authenticated with insufficient balance')
        .uponReceiving('a request to create order with insufficient funds')
        .withRequest({
          method: 'POST',
          path: '/api/v1/orders',
          headers: headers.auth('valid-token'),
          body: {
            symbol: 'BTCUSDT',
            side: 'buy',
            type: 'limit',
            price: '45000.00',
            quantity: '1000',
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
          const response = await fetch(`${mockServer.url}/api/v1/orders`, {
            method: 'POST',
            headers: headers.auth('valid-token'),
            body: JSON.stringify({
              symbol: 'BTCUSDT',
              side: 'buy',
              type: 'limit',
              price: '45000.00',
              quantity: '1000',
            }),
          });

          expect(response.status).toBe(400);
        });
    });
  });

  describe('GET /api/v1/orders', () => {
    it('should get user orders', async () => {
      await pact
        .given('user has orders')
        .uponReceiving('a request to get user orders')
        .withRequest({
          method: 'GET',
          path: '/api/v1/orders',
          headers: headers.auth('valid-token'),
          query: { status: 'open', page: '1', limit: '20' },
        })
        .willRespondWith({
          status: 200,
          headers: headers.json,
          body: {
            items: MatchersV3.eachLike(factories.order()),
            total: MatchersV3.integer(1),
            page: MatchersV3.integer(1),
            limit: MatchersV3.integer(20),
          },
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(
            `${mockServer.url}/api/v1/orders?status=open&page=1&limit=20`,
            { headers: headers.auth('valid-token') }
          );

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data.items).toBeInstanceOf(Array);
        });
    });
  });

  describe('GET /api/v1/orders/:id', () => {
    it('should get order by id', async () => {
      await pact
        .given('order exists with id order-123')
        .uponReceiving('a request to get order by id')
        .withRequest({
          method: 'GET',
          path: '/api/v1/orders/order-123',
          headers: headers.auth('valid-token'),
        })
        .willRespondWith({
          status: 200,
          headers: headers.json,
          body: factories.order(),
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/orders/order-123`, {
            headers: headers.auth('valid-token'),
          });

          expect(response.status).toBe(200);
        });
    });

    it('should return 404 for non-existent order', async () => {
      await pact
        .given('order does not exist')
        .uponReceiving('a request for non-existent order')
        .withRequest({
          method: 'GET',
          path: '/api/v1/orders/nonexistent',
          headers: headers.auth('valid-token'),
        })
        .willRespondWith({
          status: 404,
          headers: headers.json,
          body: {
            error: 'NotFound',
            message: MatchersV3.string('Order not found'),
          },
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/orders/nonexistent`, {
            headers: headers.auth('valid-token'),
          });

          expect(response.status).toBe(404);
        });
    });
  });

  describe('DELETE /api/v1/orders/:id', () => {
    it('should cancel an open order', async () => {
      await pact
        .given('open order exists with id order-123')
        .uponReceiving('a request to cancel an order')
        .withRequest({
          method: 'DELETE',
          path: '/api/v1/orders/order-123',
          headers: headers.auth('valid-token'),
        })
        .willRespondWith({
          status: 200,
          headers: headers.json,
          body: {
            ...factories.order(),
            status: MatchersV3.string('cancelled'),
          },
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/orders/order-123`, {
            method: 'DELETE',
            headers: headers.auth('valid-token'),
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data.status).toBe('cancelled');
        });
    });
  });

  describe('GET /api/v1/trades', () => {
    it('should get user trade history', async () => {
      await pact
        .given('user has trade history')
        .uponReceiving('a request to get trade history')
        .withRequest({
          method: 'GET',
          path: '/api/v1/trades',
          headers: headers.auth('valid-token'),
        })
        .willRespondWith({
          status: 200,
          headers: headers.json,
          body: {
            items: MatchersV3.eachLike({
              id: MatchersV3.uuid(),
              orderId: MatchersV3.uuid(),
              symbol: MatchersV3.string('BTCUSDT'),
              side: matchers.orderSide,
              price: matchers.price,
              quantity: matchers.quantity,
              fee: matchers.decimal,
              feeCurrency: MatchersV3.string('BTC'),
              createdAt: matchers.timestamp,
            }),
            total: MatchersV3.integer(1),
          },
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/trades`, {
            headers: headers.auth('valid-token'),
          });

          expect(response.status).toBe(200);
        });
    });
  });
});
