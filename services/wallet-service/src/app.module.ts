import { MiddlewareConsumer, Module, NestModule, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletsModule } from './modules/wallets/wallets.module';
import { AuthModule } from './modules/auth/auth.module';
import { APMInterceptor, CompressionInterceptor, DeviceContextMiddleware, DeviceFingerprintMiddleware, ETagInterceptor, PerformanceModule, RequestContextInterceptor, SecurityModule } from '@exchange/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';

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
        url: configService.get('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: configService.get('NODE_ENV') === 'development',
        schema: 'wallets',
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
    WalletsModule,
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
      .apply(DeviceFingerprintMiddleware, DeviceContextMiddleware)
      .forRoutes('*');
  }
}
