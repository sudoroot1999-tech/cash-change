import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProxyModule } from './proxy/proxy.module';
import { HealthModule } from './health/health.module';
import { RateLimitGuard, SecurityModule } from '@exchange/common';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env', '../../.env'],
    }),

    ProxyModule,
    HealthModule,
    SecurityModule
  ],
  providers: [
    // Global Rate Limit guard
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    }
  ],
})
export class AppModule { }
