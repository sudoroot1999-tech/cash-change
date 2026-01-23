import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletService } from './wallets.service';
import { WalletController } from './wallets.controller';
import { WalletsGrpcController } from './wallets.grpc.controller';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { Address } from './entities/address.entity';
import { Transaction } from './entities/transaction.entity';
import { WithdrawalRequest } from './entities/withdrawal-request.entity';
import { DepositHistory } from './entities/deposit-history.entity';
import { InternalTransfer } from './entities/internal-transfer.entity';
import { WithdrawalWhitelist } from './entities/withdrawal-whitelist.entity';
import { WithdrawalLimit } from './entities/withdrawal-limit.entity';
import { KafkaModule, RabbitMQModule } from '@exchange/common';
import { AddressService } from './services/address.service';
import { TransactionService } from './services/transaction.service';
import { WithdrawalService } from './services/withdrawal.service';
import { InternalTransferService } from './services/internal-transfer.service';
import { DepositMonitorService } from './services/deposit-monitor.service';
import { SecurityService } from './services/security.service';
import { HDWalletService } from './services/hd-wallet.service';
import { DepositEventsService } from './services/deposit-events.service';
import { WithdrawalEventsService } from './services/withdrawal-events.service';
import { EthereumService } from '../blockchain/ethereum.service';
import { BitcoinService } from '../blockchain/bitcoin.service';
import { BSCService } from '../blockchain/bsc.service';
import { PolygonService } from '../blockchain/polygon.service';
import { SolanaService } from '../blockchain/solana.service';
import { WalletGateway } from './websocket/wallet.gateway';
import { TradingConsumer } from './consumers/trading.consumer';
import { DepositMonitoringJob } from './workers/deposit-monitor.job';
import { WalletsWorker } from './workers/wallets.worket';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Wallet,
      Address,
      Transaction,
      WithdrawalRequest,
      DepositHistory,
      InternalTransfer,
      WithdrawalWhitelist,
      WithdrawalLimit,
    ]),
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

    RabbitMQModule.forRoot({
      url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672/',
      connectionName: 'wallet-service',
      prefetch: 20,
    }),
    KafkaModule.forRoot({
      clientId: 'wallet-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    }),
  ],
  controllers: [WalletController, WalletsGrpcController],
  providers: [
    WalletService,
    AddressService,
    TransactionService,
    WithdrawalService,
    InternalTransferService,
    DepositMonitorService,
    SecurityService,
    HDWalletService,
    DepositEventsService,
    WithdrawalEventsService,

    // Blockchain Services
    EthereumService,
    BitcoinService,
    BSCService,
    PolygonService,
    SolanaService,

    // WebSocket
    WalletGateway,

    // Consumers
    TradingConsumer,

    // Jobs
    DepositMonitoringJob,
    WalletsWorker
  ],
  exports: [
    // Core Services
    WalletService,
    AddressService,
    TransactionService,
    WithdrawalService,
    InternalTransferService,
    DepositMonitorService,
    SecurityService,
    HDWalletService,
    DepositEventsService,
    WithdrawalEventsService,
    WalletGateway,
  ],
})
export class WalletsModule { }
