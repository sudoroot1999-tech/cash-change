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
    database: string;
    entities: any[];
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
    host: configService.get('DB_HOST', 'localhost'),
    port: configService.get('DB_PORT', 5432),
    username: configService.get('DB_USER', 'postgres'),
    password: configService.get('DB_PASSWORD', 'postgres'),
    database: options.database,
    entities: options.entities,
    synchronize: false, // Never use in production
    logging: configService.get('DB_LOGGING') === 'true',
    logger: 'advanced-console',
    maxQueryExecutionTime: 1000, // Log slow queries > 1s
    ssl: configService.get('DB_SSL') === 'true' 
      ? { rejectUnauthorized: false } 
      : false,
    
    // Connection pooling
    extra: {
      // Pool configuration
      min: poolConfig.min,
      max: poolConfig.max,
      idleTimeoutMillis: poolConfig.idleTimeoutMillis,
      connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
      
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
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379),
        password: configService.get('REDIS_PASSWORD'),
        db: configService.get('REDIS_QUERY_CACHE_DB', 1),
      },
      duration: 30000, // 30 seconds default cache
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

  return replicaHosts.map((host, index) => ({
    name: `replica_${index}`,
    type: 'postgres',
    host: host.trim(),
    port: configService.get('DB_PORT', 5432),
    username: configService.get('DB_USER', 'postgres'),
    password: configService.get('DB_PASSWORD', 'postgres'),
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
