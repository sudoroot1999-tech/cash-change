import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';

@Module({
  imports: [
    HttpModule, // Keep for REST endpoints
    ClientsModule.registerAsync([
      {
        name: 'WALLET_PACKAGE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'wallet',
            protoPath: join(__dirname, '../../libs/common/proto/wallet.proto'),
            url: configService.get('WALLET_SERVICE_GRPC_URL', 'wallet-service:5003'),
          },
        }),
      },
    ]),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}

