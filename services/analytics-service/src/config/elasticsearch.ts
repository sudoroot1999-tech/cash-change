import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

export const elasticsearchClient = new Client({
  node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
    password: process.env.ELASTICSEARCH_PASSWORD || 'changeme',
  },
  maxRetries: 3,
  requestTimeout: 30000,
});

export const INDEX_PREFIX = process.env.ELASTICSEARCH_INDEX_PREFIX || 'exchange';

export const INDICES = {
  TRADES: `${INDEX_PREFIX}-trades`,
  USERS: `${INDEX_PREFIX}-users`,
  LOGS: `${INDEX_PREFIX}-logs`,
  EVENTS: `${INDEX_PREFIX}-events`,
};

export async function setupElasticsearchIndices() {
  try {
    // Create trades index
    const tradesExists = await elasticsearchClient.indices.exists({
      index: INDICES.TRADES,
    });

    if (!tradesExists) {
      await elasticsearchClient.indices.create({
        index: INDICES.TRADES,
        body: {
          mappings: {
            properties: {
              trade_id: { type: 'keyword' },
              user_id: { type: 'keyword' },
              pair: { type: 'keyword' },
              side: { type: 'keyword' },
              price: { type: 'double' },
              amount: { type: 'double' },
              total: { type: 'double' },
              fee: { type: 'double' },
              timestamp: { type: 'date' },
            },
          },
        },
      });
      console.log(`Created index: ${INDICES.TRADES}`);
    }

    // Create users index
    const usersExists = await elasticsearchClient.indices.exists({
      index: INDICES.USERS,
    });

    if (!usersExists) {
      await elasticsearchClient.indices.create({
        index: INDICES.USERS,
        body: {
          mappings: {
            properties: {
              user_id: { type: 'keyword' },
              email_hash: { type: 'keyword' },
              level: { type: 'keyword' },
              registration_date: { type: 'date' },
              last_active: { type: 'date' },
              total_trades: { type: 'long' },
              total_volume: { type: 'double' },
            },
          },
        },
      });
      console.log(`Created index: ${INDICES.USERS}`);
    }

    // Create logs index
    const logsExists = await elasticsearchClient.indices.exists({
      index: INDICES.LOGS,
    });

    if (!logsExists) {
      await elasticsearchClient.indices.create({
        index: INDICES.LOGS,
        body: {
          settings: {
            number_of_shards: 3,
            number_of_replicas: 1,
          },
          mappings: {
            properties: {
              timestamp: { type: 'date' },
              level: { type: 'keyword' },
              service: { type: 'keyword' },
              message: { type: 'text' },
              metadata: { type: 'object' },
            },
          },
        },
      });
      console.log(`Created index: ${INDICES.LOGS}`);
    }

    console.log('Elasticsearch indices setup complete');
  } catch (error) {
    console.error('Error setting up Elasticsearch indices:', error);
  }
}

export async function closeElasticsearch() {
  await elasticsearchClient.close();
}
