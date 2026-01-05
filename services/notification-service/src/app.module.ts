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

    RabbitMQModule.forRoot({
      url: process.env.RABBITMQ_URL || 'amqp://exchange:rabbitmq_dev_password@localhost:5672/',
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
