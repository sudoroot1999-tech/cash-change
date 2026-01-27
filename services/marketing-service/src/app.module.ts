import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Entities
import { ReferralCampaign } from './entities/ReferralCampaign.entity';
import { ReferralLink } from './entities/ReferralLink.entity';
import { Referral } from './entities/Referral.entity';
import { ReferralCommission } from './entities/ReferralCommission.entity';
import { AirdropCampaign } from './entities/AirdropCampaign.entity';
import { AirdropAllocation } from './entities/AirdropAllocation.entity';
import { LoyaltyTier } from './entities/LoyaltyTier.entity';
import { UserLoyalty } from './entities/UserLoyalty.entity';
import { LoyaltyTransaction } from './entities/LoyaltyTransaction.entity';
import { EmailCampaign } from './entities/EmailCampaign.entity';
import { EmailLog } from './entities/EmailLog.entity';
import { UserSegment } from './entities/UserSegment.entity';
import { PushCampaign } from './entities/PushCampaign.entity';
import { PushNotificationLog } from './entities/PushNotificationLog.entity';
import { DeviceToken } from './entities/DeviceToken.entity';
import { AffiliateProgram } from './entities/AffiliateProgram.entity';
import { Affiliate } from './entities/Affiliate.entity';
import { MarketingContent } from './entities/MarketingContent.entity';
import { MarketingAttribution } from './entities/MarketingAttribution.entity';
import { CampaignPerformance } from './entities/CampaignPerformance.entity';

// Services
import { ReferralService } from './modules/referral/referral.service';
import { AirdropService } from './modules/airdrop/airdrop.service';
import { LoyaltyService } from './modules/loyalty/loyalty.service';
import { EmailService } from './modules/email/email.service';
import { AnalyticsService } from './modules/analytics/analytics.service';

// Controllers
import { ReferralController } from './modules/referral/referral.controller';
import { AirdropController } from './modules/airdrop/airdrop.controller';
import { LoyaltyController } from './modules/loyalty/loyalty.controller';
import { EmailController } from './modules/email/email.controller';

import { APMInterceptor, CompressionInterceptor, CORSMiddleware, CSRFMiddleware, DeviceContextMiddleware, DeviceFingerprintMiddleware, ETagInterceptor, getOptimizedDatabaseConfig, KafkaModule, PerformanceModule, RabbitMQModule, RequestContextInterceptor, SecurityMiddleware, SecurityModule } from '@exchange/common';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => (
        getOptimizedDatabaseConfig(configService, {
          schema: 'lms',
        })
      ),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      ReferralCampaign,
      ReferralLink,
      Referral,
      ReferralCommission,
      AirdropCampaign,
      AirdropAllocation,
      LoyaltyTier,
      UserLoyalty,
      LoyaltyTransaction,
      EmailCampaign,
      EmailLog,
      UserSegment,
      PushCampaign,
      PushNotificationLog,
      DeviceToken,
      AffiliateProgram,
      Affiliate,
      MarketingContent,
      MarketingAttribution,
      CampaignPerformance,
    ]),
    AuthModule,
    SecurityModule,
    PerformanceModule
  ],
  controllers: [ReferralController, AirdropController, LoyaltyController, EmailController],
  providers: [
    ReferralService,
    AirdropService,
    LoyaltyService,
    EmailService,
    AnalyticsService,

  ],
})
export class AppModule {}
