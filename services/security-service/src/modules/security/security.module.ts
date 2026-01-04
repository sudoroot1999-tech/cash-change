import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { AntiPhishingCode } from './entities/anti-phishing-code.entity';
import { TrustedDevice } from './entities/trusted-device.entity';
import { WithdrawalWhitelist } from './entities/withdrawal-whitelist.entity';
import { ApiKey } from './entities/api-key.entity';
import { LoginHistory } from './entities/login-history.entity';
import { SecurityEvent } from './entities/security-event.entity';
import { RiskScore } from './entities/risk-score.entity';
import { ColdWallet } from './entities/cold-wallet.entity';
import { ProofOfReserves } from './entities/proof-of-reserves.entity';
import { InsuranceFundTransaction, InsuranceFundBalance } from './entities/insurance-fund.entity';
import { BugBountySubmission } from './entities/bug-bounty.entity';
import { Incident } from './entities/incident.entity';
import { UserSession } from './entities/user-session.entity';

// Services
import {
  AntiPhishingService,
  DeviceFingerprintService,
  WithdrawalWhitelistService,
  ApiKeyService,
  LoginSecurityService,
  TransactionMonitoringService,
  ColdWalletService,
  ProofOfReservesService,
  InsuranceFundService,
  BugBountyService,
  IncidentResponseService,
} from './services';

// Controllers
import {
  AntiPhishingController,
  WithdrawalWhitelistController,
  ApiKeyController,
  LoginSecurityController,
  BugBountyController,
} from './controllers';

import { SecurityAdminController } from './controllers/admin/security-admin.controller';

// Guards & Middleware
import { ApiKeyGuard } from '../../guards/api-key.guard';
import { QueueService, RateLimitGuard } from '@exchange/common';
import { DeviceFingerprintMiddleware } from '../../middlewares/device-fingerprint.middleware';

// Jobs
import { WhitelistActivationJob } from './workers/whitelist-activation.job';
import { RiskScoringJob } from './workers/risk-scoring.job';
import { SecurityWorker } from './workers/security.worker';

const entities = [
  AntiPhishingCode,
  TrustedDevice,
  WithdrawalWhitelist,
  ApiKey,
  LoginHistory,
  SecurityEvent,
  RiskScore,
  ColdWallet,
  ProofOfReserves,
  InsuranceFundTransaction,
  InsuranceFundBalance,
  BugBountySubmission,
  Incident,
  UserSession,
];

@Module({
  imports: [
    TypeOrmModule.forFeature(entities),
  ],
  controllers: [
    AntiPhishingController,
    WithdrawalWhitelistController,
    ApiKeyController,
    LoginSecurityController,
    BugBountyController,
    SecurityAdminController,
  ],
  providers: [
    // Services
    QueueService,
    AntiPhishingService,
    DeviceFingerprintService,
    WithdrawalWhitelistService,
    ApiKeyService,
    LoginSecurityService,
    TransactionMonitoringService,
    ColdWalletService,
    ProofOfReservesService,
    InsuranceFundService,
    BugBountyService,
    IncidentResponseService,
    
    // Guards
    ApiKeyGuard,
    RateLimitGuard,
    
    // Jobs
    WhitelistActivationJob,
    RiskScoringJob,
    SecurityWorker
  ],
  exports: [
    AntiPhishingService,
    DeviceFingerprintService,
    WithdrawalWhitelistService,
    ApiKeyService,
    LoginSecurityService,
    TransactionMonitoringService,
    ColdWalletService,
    ProofOfReservesService,
    InsuranceFundService,
    BugBountyService,
    IncidentResponseService,
  ],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(DeviceFingerprintMiddleware)
      .forRoutes('*');
  }
}
