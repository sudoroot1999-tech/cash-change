import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuspiciousActivity } from './entities/suspicious-activity.entity';
import { AuditLog } from './entities/audit-log.entity';
import { GDPRRequest } from './entities/gdpr-request.entity';
import { TaxReport } from './entities/tax-report.entity';
import { TransactionMonitoring } from './entities/transaction-monitoring.entity';
import { PolicyAcceptance } from './entities/policy-acceptance.entity';
import { GeoRestriction } from './entities/geo-restriction.entity';
import { GDPRController } from './controllers/gdpr.controller';
import { TransactionMonitoringController } from './controllers/transaction-monitoring.controller';
import { TaxReportingController } from './controllers/tax-reporting.controller';
import { PolicyController } from './controllers/policy.controller';
import { AuditController } from './controllers/audit.controller';
import { GeoRestrictionController } from './controllers/geo-restriction.controller';
import { TransactionMonitoringService } from './services/transaction-monitoring.service';
import { GDPRService } from './services/gdpr.service';
import { GeoRestrictionService } from './services/geo-restriction.service';
import { TaxReportingService } from './services/tax-reporting.service';
import { AuditTrailService } from './services/audit-trail.service';
import { PolicyManagementService } from './services/policy-management.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SuspiciousActivity,
      AuditLog,
      GDPRRequest,
      TaxReport,
      PolicyAcceptance,
      TransactionMonitoring,
      GeoRestriction,
    ]),
  ],
  controllers: [
    GDPRController,
    TransactionMonitoringController,
    TaxReportingController,
    PolicyController,
    AuditController,
    GeoRestrictionController,
  ],
  providers: [
    TransactionMonitoringService,
    GDPRService,
    GeoRestrictionService,
    TaxReportingService,
    AuditTrailService,
    PolicyManagementService,
  ],
  exports: [
    TransactionMonitoringService,
    GDPRService,
    GeoRestrictionService,
    TaxReportingService,
    AuditTrailService,
    PolicyManagementService,
  ],
})
export class ComplianceModule { }
