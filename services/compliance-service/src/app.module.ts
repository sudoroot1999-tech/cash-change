import { MiddlewareConsumer, Module, NestModule, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from "@nestjs/jwt";
import { KycModule } from './modules/kyc/kyc.module';
import { AuthModule } from './modules/auth/auth.module';
import { APMInterceptor, CompressionInterceptor, CORSMiddleware, CSRFMiddleware, DeviceContextMiddleware, DeviceFingerprintMiddleware, ETagInterceptor, KafkaModule, PerformanceModule, RabbitMQModule, RequestContextInterceptor, SecurityMiddleware, SecurityModule, StorageModule } from '@exchange/common';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env', '../../.env']
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: true,
        schema: 'compliance',
      }),
    }),

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

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN', '15m') },
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

    KycModule,
    ComplianceModule,
    AuthModule,
    PerformanceModule,
    SecurityModule
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
})
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
