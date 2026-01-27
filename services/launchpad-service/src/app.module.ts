import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APMInterceptor, CompressionInterceptor, CORSMiddleware, CSRFMiddleware, DeviceContextMiddleware, DeviceFingerprintMiddleware, ETagInterceptor, getOptimizedDatabaseConfig, KafkaModule, PerformanceModule, RabbitMQModule, RequestContextInterceptor, SecurityMiddleware, SecurityModule } from '@exchange/common';
import { AuthModule } from './modules/auth/auth.module';
import { LaunchpadModule } from './modules/launchpad/launchpad.module';
import { TokenModule } from './modules/token/token.module';
import { MiddlewareConsumer, Module, NestModule, ValidationPipe } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { JwtModule } from "@nestjs/jwt";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env', '../.env', '../../.env']
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => (
                getOptimizedDatabaseConfig(configService, {
                    schema: 'launchpad',
                })
            ),
            inject: [ConfigService],
        }),
        RabbitMQModule.forRoot({
            url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672/',
            connectionName: 'launchpad-service',
            prefetch: 10,
        }),
        KafkaModule.forRoot({
            clientId: 'launchpad-service',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
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
        AuthModule,
        LaunchpadModule,
        TokenModule,
        PerformanceModule
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
    ],
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
