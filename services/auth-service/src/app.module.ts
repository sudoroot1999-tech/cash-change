import { MiddlewareConsumer, Module, NestModule, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from './modules/auth/auth.module';
import { RabbitMQModule, KafkaModule, PerformanceModule, SecurityModule, RequestContextInterceptor, DeviceFingerprintMiddleware, DeviceContextMiddleware, CompressionInterceptor, APMInterceptor, getOptimizedDatabaseConfig, ETagInterceptor, SecurityMiddleware, CSRFMiddleware, CORSMiddleware } from "@exchange/common"
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { JwtStrategy } from './modules/auth/sterategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env', '../../.env'],
    }),

    PassportModule.register({ defaultStrategy: 'jwt' }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '15m'),
        },
      }),
    }),

    RabbitMQModule.forRoot({
      url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672/',
      connectionName: 'auth-service',
      prefetch: 10,
    }),

    KafkaModule.forRoot({
      clientId: 'auth-service',
      brokers: (process.env.KAFKA_LISTENERS || 'localhost:29092').split(','),
    }),

    AuthModule,
    PerformanceModule,
    SecurityModule
  ],
  providers: [
    JwtStrategy,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
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
