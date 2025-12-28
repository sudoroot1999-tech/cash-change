import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [
    HttpModule, // Keep for REST endpoints
    ClientsModule.registerAsync([
      {
        name: 'USER_PACKAGE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'user',
            protoPath: join(__dirname, '../../../../../libs/common/proto/user.proto'),
            url: configService.get('USER_SERVICE_GRPC_URL', 'user-service:5001'),
          },
        }),
      },
      {
        name: 'MARKET_PACKAGE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'market',
            protoPath: join(__dirname, '../../../../../libs/common/proto/market.proto'),
            url: configService.get('MARKET_DATA_GRPC_URL', 'market-data-service:5005'),
          },
        }),
      },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}

