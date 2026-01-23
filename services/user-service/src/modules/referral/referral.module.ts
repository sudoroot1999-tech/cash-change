import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AffiliateCampaign, BonusCampaign, FraudDetection, PayoutHistory, ReferralAnalytics, ReferralCode, ReferralCommission, ReferralRelationship } from "./entities";
import { ReferralController } from "./referral.controller";
import { AffiliateController, FraudController, PayoutController } from "./controllers";
import { ReferralService } from "./referral.service";
import { AffiliateService, FraudDetectionService, PayoutService } from "./services";
import { AdminGuard } from "@exchange/common";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ReferralCode,
            ReferralRelationship,
            ReferralCommission,
            AffiliateCampaign,
            PayoutHistory,
            BonusCampaign,
            FraudDetection,
            ReferralAnalytics,
        ]),
    ],
    controllers: [
        ReferralController,
        AffiliateController,
        PayoutController,
        FraudController,
    ],
    providers: [
        ReferralService,
        AffiliateService,
        FraudDetectionService,
        PayoutService,
        AdminGuard,
    ],
    exports: [
        ReferralService,
        AffiliateService,
        FraudDetectionService,
        PayoutService,
    ],
})
export class ReferralModule { }