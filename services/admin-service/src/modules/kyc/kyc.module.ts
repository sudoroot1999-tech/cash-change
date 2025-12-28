import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';

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
    ]),
  ],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}

