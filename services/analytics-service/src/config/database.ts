import knex, { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config();

// TimescaleDB connection for analytics data warehouse
export const analyticsDb: Knex = knex({
  client: 'pg',
  connection: {
    host: process.env.TIMESCALE_HOST || 'localhost',
    port: parseInt(process.env.TIMESCALE_PORT || '5432'),
    database: process.env.TIMESCALE_DB || 'analytics_db',
    user: process.env.TIMESCALE_USER || 'analytics_user',
    password: process.env.TIMESCALE_PASSWORD || 'analytics_password',
  },
  pool: {
    min: 2,
    max: 20,
  },
  acquireConnectionTimeout: 10000,
});

// Trading database connection (read-only replica)
export const tradingDb: Knex = knex({
  client: 'pg',
  connection: {
    host: process.env.TRADING_DB_HOST || 'localhost',
    port: parseInt(process.env.TRADING_DB_PORT || '5432'),
    database: process.env.TRADING_DB_NAME || 'trading_db',
    user: process.env.TRADING_DB_USER || 'trading_user',
    password: process.env.TRADING_DB_PASSWORD || 'trading_password',
  },
  pool: {
    min: 2,
    max: 10,
  },
});

// Auth database connection (read-only replica)
export const authDb: Knex = knex({
  client: 'pg',
  connection: {
    host: process.env.AUTH_DB_HOST || 'localhost',
    port: parseInt(process.env.AUTH_DB_PORT || '5432'),
    database: process.env.AUTH_DB_NAME || 'auth_db',
    user: process.env.AUTH_DB_USER || 'auth_user',
    password: process.env.AUTH_DB_PASSWORD || 'auth_password',
  },
  pool: {
    min: 2,
    max: 10,
  },
});

export async function setupTimescaleExtension() {
  try {
    await analyticsDb.raw('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;');
    console.log('TimescaleDB extension enabled');
  } catch (error) {
    console.error('Error setting up TimescaleDB extension:', error);
  }
}

export async function closeConnections() {
  await analyticsDb.destroy();
  await tradingDb.destroy();
  await authDb.destroy();
}

// Helper function for raw queries
export async function query(sql: string, params?: any[]) {
  const result = await analyticsDb.raw(sql, params || []);
  return result;
}
