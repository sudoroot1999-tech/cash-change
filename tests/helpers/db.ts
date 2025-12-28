/**
 * Database Test Helpers
 * Utilities for database operations in tests
 */

import { DataSource, EntityTarget, Repository } from 'typeorm';

export interface DbTestContext {
  dataSource: DataSource;
}

/**
 * Create a test database connection
 */
export async function createTestDataSource(
  entities: any[],
  synchronize = true,
): Promise<DataSource> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
    username: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
    database: process.env.TEST_DB_NAME || 'exchange_test',
    entities,
    synchronize,
    dropSchema: true, // Clean slate for each test
    logging: false,
  });

  await dataSource.initialize();
  return dataSource;
}

/**
 * Close test database connection
 */
export async function closeTestDataSource(dataSource: DataSource): Promise<void> {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
}

/**
 * Clear all tables in the database
 */
export async function clearDatabase(dataSource: DataSource): Promise<void> {
  const entities = dataSource.entityMetadatas;
  
  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name);
    await repository.clear();
  }
}

/**
 * Seed database with test data
 */
export async function seedDatabase<T>(
  dataSource: DataSource,
  entity: EntityTarget<T>,
  data: Partial<T>[],
): Promise<T[]> {
  const repository = dataSource.getRepository(entity);
  const entities = data.map(item => repository.create(item as T));
  return repository.save(entities as T[]);
}

/**
 * Get repository for testing
 */
export function getTestRepository<T>(
  dataSource: DataSource,
  entity: EntityTarget<T>,
): Repository<T> {
  return dataSource.getRepository(entity);
}

/**
 * Transaction wrapper for tests
 */
export async function withTransaction<T>(
  dataSource: DataSource,
  fn: (queryRunner: any) => Promise<T>,
): Promise<T> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const result = await fn(queryRunner);
    await queryRunner.commitTransaction();
    return result;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Check if record exists
 */
export async function recordExists<T>(
  dataSource: DataSource,
  entity: EntityTarget<T>,
  criteria: Partial<T>,
): Promise<boolean> {
  const repository = dataSource.getRepository(entity);
  const count = await repository.count({ where: criteria as any });
  return count > 0;
}
