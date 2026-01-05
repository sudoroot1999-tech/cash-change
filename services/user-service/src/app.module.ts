import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { KafkaModule, PerformanceModule, RabbitMQModule, StorageModule } from '@exchange/common';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env', '../../.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('POSTGRES_HOST'),
        port: configService.get('POSTGRES_PORT'),
        username: configService.get('POSTGRES_USER'),
        password: configService.get('POSTGRES_PASSWORD'),
        database: configService.get('POSTGRES_DB'),
        autoLoadEntities: true,
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        schema: 'users',
      }),
    }),

    // Storage
    StorageModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        endPoint: configService.get('MINIO_HOST', 'localhost'),
        port: parseInt(configService.get('MINIO_PORT', '9000')),
        useSSL: configService.get('MINIO_USE_SSL', 'false') === 'true',
        accessKey: configService.get('MINIO_ROOT_USER', 'minio_admin'),
        secretKey: configService.get('MINIO_ROOT_PASSWORD', 'minio_dev_password'),
      }),
    }),

    RabbitMQModule.forRoot({
      url: process.env.RABBITMQ_URL || 'amqp://exchange:rabbitmq_dev_password@localhost:5672/',
      connectionName: 'user-service',
      prefetch: 10,
    }),
    
    KafkaModule.forRoot({
      clientId: 'user-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:29092').split(','),
    }),

    // Feature Modules
    UsersModule,
    PerformanceModule,
    HealthModule,
    AuthModule,
  ]
}
)
export class AppModule {}
