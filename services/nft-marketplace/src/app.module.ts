import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APMInterceptor, CompressionInterceptor, CORSMiddleware, CSRFMiddleware, DeviceContextMiddleware, DeviceFingerprintMiddleware, ETagInterceptor, getOptimizedDatabaseConfig, KafkaModule, PerformanceModule, RabbitMQModule, RequestContextInterceptor, SecurityMiddleware, SecurityModule } from '@exchange/common';
import { AuthModule } from './modules/auth/auth.module';
import { NftModule } from './modules/nft/nft.module';
import { MiddlewareConsumer, Module, NestModule, ValidationPipe } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';

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
                    schema: 'nft',
                })
            ),
            inject: [ConfigService],
        }),
        RabbitMQModule.forRoot({
            url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672/',
            connectionName: 'nft-service',
            prefetch: 10,
        }),
        KafkaModule.forRoot({
            clientId: 'nft-service',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
        }),
        SecurityModule,
        AuthModule,
        NftModule,
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
