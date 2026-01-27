import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Loan } from './entities/loan.entity';
import { LoanRequest } from './entities/loan-request.entity';
import { LoanRepayment } from './entities/loan-repayment.entity';
import { CreditScore } from './entities/credit-score.entity';
import { CollateralMonitoring } from './entities/collateral-monitoring.entity';
import { InsuranceFund } from './entities/insurance-fund.entity';

// Services
import { LoanService } from './services/loan.service';
import { LoanMatchingService } from './services/loan-matching.service';
import { CreditScoringService } from './services/credit-scoring.service';
import { InterestRateService } from './services/interest-rate.service';
import { CollateralMonitoringService } from './services/collateral-monitoring.service';

// Controllers
import { LoanController } from './controllers/loan.controller';

@Module({
  imports: [
    // Entity repositories
    TypeOrmModule.forFeature([
      Loan,
      LoanRequest,
      LoanRepayment,
      CreditScore,
      CollateralMonitoring,
      InsuranceFund,
    ]),
  ],
  controllers: [LoanController],
  providers: [
    LoanService,
    LoanMatchingService,
    CreditScoringService,
    InterestRateService,
    CollateralMonitoringService,
  ],
})
export class P2pLendingModule {}
