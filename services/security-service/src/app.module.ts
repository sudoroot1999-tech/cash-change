import { MiddlewareConsumer, Module, NestModule, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from "@nestjs/jwt";
import { AuthModule } from './modules/auth/auth.module';
import { SecurityModule } from './modules/security/security.module';
import { PerformanceModule, SecurityModule as LibSecurityModule, RequestContextInterceptor, DeviceFingerprintMiddleware, DeviceContextMiddleware, APMInterceptor, CompressionInterceptor, getOptimizedDatabaseConfig, ETagInterceptor, SecurityMiddleware, CSRFMiddleware, CORSMiddleware } from '@exchange/common';
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
      useFactory: (configService: ConfigService) => (
        getOptimizedDatabaseConfig(configService, {
          schema: 'security',
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
    SecurityModule,
    PerformanceModule,
    LibSecurityModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, transform: true })
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
