import { MiddlewareConsumer, Module, NestModule, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { APMInterceptor, CompressionInterceptor, CORSMiddleware, CSRFMiddleware, DeviceContextMiddleware, DeviceFingerprintMiddleware, ETagInterceptor, getOptimizedDatabaseConfig, JwtAuthGuard, JwtStrategy, KafkaModule, PerformanceModule, RabbitMQModule, RequestContextInterceptor, SecurityMiddleware, SecurityModule, StorageModule } from '@exchange/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ReferralModule } from './modules/referral/referral.module';

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
      useFactory: (configService: ConfigService) => (
        getOptimizedDatabaseConfig(configService, {
          schema: 'users',
          // migrations: ["./migrations/*.sql"],
          // migrationsRun:true,
        })
      ),
    }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN', '15m') },
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
    ReferralModule,
    HealthModule,
    AuthModule,
    PerformanceModule,
    SecurityModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: APMInterceptor
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ETagInterceptor
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CompressionInterceptor
    }
  ]
}
)
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        SecurityMiddleware,
        CSRFMiddleware,
        CORSMiddleware,
        DeviceFingerprintMiddleware,
        DeviceContextMiddleware
      )
      .forRoutes('*');
  }
}
