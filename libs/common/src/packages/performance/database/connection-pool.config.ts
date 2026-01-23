import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export interface DatabasePoolConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  acquireTimeoutMillis: number;
}

export const getOptimizedDatabaseConfig = (
  configService: ConfigService,
  options: {
    entities?: any[];
    schema?: string;
    migrations?: string[];
    migrationsRun?: boolean;
    poolConfig?: Partial<DatabasePoolConfig>;
  },
): TypeOrmModuleOptions => {
  const defaultPoolConfig: DatabasePoolConfig = {
    min: configService.get('DB_POOL_MIN', 10),
    max: configService.get('DB_POOL_MAX', 50),
    idleTimeoutMillis: configService.get('DB_IDLE_TIMEOUT', 30000),
    connectionTimeoutMillis: configService.get('DB_CONNECTION_TIMEOUT', 5000),
    acquireTimeoutMillis: configService.get('DB_ACQUIRE_TIMEOUT', 10000),
  };

  const poolConfig = { ...defaultPoolConfig, ...options.poolConfig };

  return {
    type: 'postgres',
    url: configService.get('DATABASE_URL'),
    entities: options.entities,
    synchronize: true, // Never use in production
    logging: true,
    logger: 'advanced-console',
    maxQueryExecutionTime: 1000, // Log slow queries > 1s
    ssl: configService.get('DB_SSL') === 'true'
      ? { rejectUnauthorized: false }
      : false,

    schema: options.schema,

    migrations: options.migrations,

    migrationsRun: options.migrationsRun,

    // Connection pooling
    extra: {
      // Pool configuration
      min: poolConfig.min || 1,
      max: poolConfig.max || 2,
      idleTimeoutMillis: poolConfig.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: poolConfig.connectionTimeoutMillis || 5000,

      // Performance optimizations
      statement_timeout: configService.get('DB_STATEMENT_TIMEOUT', 30000),
      query_timeout: configService.get('DB_QUERY_TIMEOUT', 30000),

      // Connection health checks
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,

      // Application name for monitoring
      application_name: configService.get('APP_NAME', 'crypto-exchange'),
    },

    // Connection retry logic
    retryAttempts: 3,
    retryDelay: 3000,

    // Auto-load entities
    autoLoadEntities: true,

    // Cache settings for queries
    cache: {
      type: 'redis',
      options: {
        url: configService.get('REDIS_URL'),
      },
      duration: 60000, // 60 seconds default cache
      ignoreErrors: true, // Don't fail queries if Redis is down
    },
  };
};

/**
 * Read replica configuration for heavy reads
 */
export const getReadReplicaConfig = (
  configService: ConfigService,
  options: {
    database: string;
    entities: any[];
  },
): TypeOrmModuleOptions[] => {
  const replicaHosts = configService.get('DB_REPLICA_HOSTS', '').split(',').filter(Boolean);

  if (replicaHosts.length === 0) {
    return [];
  }

  return replicaHosts.map((url, index) => ({
    name: `replica_${index}`,
    type: 'postgres',
    url: url.trim(),
    database: options.database,
    entities: options.entities,
    synchronize: false,

    extra: {
      min: 5,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    },
  }));
};
