import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';
import { AuditService } from './services/audit.service';
import { KycProviderService } from './services/kyc-provider.service';
import { OcrService } from './services/ocr.service';
import { KycEventsService } from './services/kyc-events.service';
import { KycDocument } from './entities/kyc-document.entity';
import { KycVerificationRequest } from './entities/kyc-verification-request.entity';
import { KycAuditLog } from './entities/kyc-audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KycDocument,
      KycVerificationRequest,
      KycAuditLog,
    ]),
    ClientsModule.registerAsync([
      {
        name: 'USER_PACKAGE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'user',
            protoPath: join(__dirname, '../../libs/common/proto/user.proto'),
            url: configService.get('USER_SERVICE_GRPC_URL', 'localhost:5001'),
          },
        }),
      },
    ]),
  ],
  controllers: [KycController],
  providers: [
    KycService, 
    AuditService,
    KycProviderService,
    OcrService,
    KycEventsService
  ],
  exports: [KycService],
})
export class KycModule { }
