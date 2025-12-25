import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { WalletsGrpcController } from './wallets.grpc.controller';

import { WalletsEventsController } from './wallets.events.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet])],
  controllers: [WalletsController, WalletsGrpcController, WalletsEventsController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
