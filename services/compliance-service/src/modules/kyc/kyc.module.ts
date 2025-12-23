import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RABBITMQ } from '@exchange/common';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KycRequest } from './entities/kyc-request.entity';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([KycRequest]),
    ClientsModule.registerAsync([
      {
        name: 'USER_PACKAGE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'user',
            protoPath: join(__dirname, '../../../../libs/common/proto/user.proto'),
            url: configService.get('USER_SERVICE_GRPC_URL', 'user-service:5001'),
          },
        }),
      },
      {
        name: 'COMPLIANCE_PACKAGE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              `${configService.get<string>('RABBITMQ_HOST', 'rabbitmq')}:${configService.get<string>('RABBITMQ_PORT', '5672')}${configService.get<string>('RABBITMQ_USER', 'exchange')}:${configService.get<string>('RABBITMQ_PASSWORD', 'rabbitmq_dev_password')}`,
            ],
            queue: RABBITMQ.QUEUES.KYC_UPDATED,
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
    ]),
  ],
  controllers: [KycController],
  providers: [KycService],
})
export class KycModule {}
