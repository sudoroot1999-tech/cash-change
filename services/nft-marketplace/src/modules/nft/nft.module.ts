import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';

import { CollectionsModule } from './collections/collections.module';
import { NftsModule } from './nfts/nfts.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { AuctionsModule } from './auctions/auctions.module';
import { FractionalModule } from './fractional/fractional.module';
import { StakingModule } from './staking/staking.module';
import { LoansModule } from './loans/loans.module';
import { GamificationModule } from './gamification/gamification.module';
import { IpfsModule } from './ipfs/ipfs.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    CollectionsModule,
    NftsModule,
    MarketplaceModule,
    AuctionsModule,
    FractionalModule,
    StakingModule,
    LoansModule,
    GamificationModule,
    IpfsModule,
    BlockchainModule,
    AnalyticsModule,
  ],
})
export class NftModule {}
