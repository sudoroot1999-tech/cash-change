import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ProxyModule } from './proxy/proxy.module';
import { HealthModule } from './health/health.module';
import { CORSMiddleware, DeviceContextMiddleware, DeviceFingerprintMiddleware, JwtAuthGuard, JwtStrategy, RateLimiterService, RateLimitGuard, SecurityMiddleware } from '@exchange/common';
import { APP_GUARD } from '@nestjs/core';

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
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '15m') },
      }),
    }),

    ProxyModule,
    HealthModule,
  ],
  providers: [
    JwtStrategy,
    RateLimiterService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },

    // Global Rate Limit guard
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    }
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityMiddleware, CORSMiddleware, DeviceFingerprintMiddleware, DeviceContextMiddleware)
      .forRoutes('*');
  }
}
