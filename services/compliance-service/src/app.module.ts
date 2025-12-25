import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KycModule } from './modules/kyc/kyc.module';
import { AmlModule } from './modules/aml/aml.module';
import { AuthModule } from './modules/auth/auth.module';
import { StorageModule } from '@exchange/common';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    KycModule,
    AmlModule,
    AuthModule,
  ],
})
export class AppModule {}
