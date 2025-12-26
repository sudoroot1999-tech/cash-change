import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { WalletsGrpcController } from './wallets.grpc.controller';

import { WalletsEventsController } from './wallets.events.controller';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet]),
    ClientsModule.registerAsync([
      {
        name: 'MARKET_PACKAGE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'market',
            protoPath: join(__dirname, '../../libs/common/proto/market.proto'),
            url: configService.get('MARKET_DATA_GRPC_URL', 'localhost:5005'),
          },
        }),
      },
    ]),
  ],
  controllers: [WalletsController, WalletsGrpcController, WalletsEventsController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
