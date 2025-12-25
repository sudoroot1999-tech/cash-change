import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RABBITMQ } from '@exchange/common';
import { Order } from './entities/order.entity';
import { Trade } from './entities/trade.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Trade]),
    ClientsModule.registerAsync([
      {
        name: 'WALLET_PACKAGE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'wallet',
            protoPath: join(__dirname, '../../../../../libs/common/proto/wallet.proto'),
            url: configService.get('WALLET_SERVICE_GRPC_URL', 'localhost:5003'),
          },
        }),
      },
      {
        name: 'TRADING_PACKAGE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672')],
            queue: RABBITMQ.QUEUES.TRADE_EXECUTED,
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
      {
        name: 'MATCHING_PACKAGE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'matching',
            protoPath: join(__dirname, '../../../../../libs/common/proto/matching.proto'),
            url: configService.get('MATCHING_ENGINE_GRPC_URL', 'matching-engine:5010'),
          },
        }),
      },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
