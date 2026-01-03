import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { AuthModule } from './modules/auth/auth.module';
import { KafkaModule, PerformanceModule, RabbitMQModule } from '@exchange/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env', '../../.env'],
    }),

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
        schema: 'notifications',
      }),
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Prefer REDIS_URL when provided (docker-compose currently injects this),
        // otherwise use REDIS_HOST/REDIS_PORT/REDIS_PASSWORD as in .env.example.
        const redisUrl = (config.get<string>('REDIS_URL') || '').trim();
        const redis =
          redisUrl.length > 0
            ? redisUrl
            : {
                host: config.get<string>('REDIS_HOST') || 'localhost',
                port: Number(config.get<string | number>('REDIS_PORT') || 6379),
                // Match docker-compose default when REDIS_PASSWORD is unset
                password: config.get<string>('REDIS_PASSWORD') || 'redis_dev_password',
              };

        return {
          redis,
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
          },
        };
      },
    }),

    RabbitMQModule.forRoot({
      url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672/',
      connectionName: 'notification-service',
      prefetch: 10,
    }),

    KafkaModule.forRoot({
      clientId: 'notification-service',
      brokers: (process.env.KAFKA_LISTENERS || 'localhost:29092').split(','),
    }),

    PerformanceModule,
    NotificationsModule,
    TemplatesModule,
    PreferencesModule,
    AuthModule,
  ],
})
export class AppModule {}
