import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { NftListing } from '../../../entities/nft-listing.entity';
import { Nft } from '../../../entities/nft.entity';
import { NftsModule } from '../nfts/nfts.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NftListing, Nft]),
    NftsModule,
    BlockchainModule,
  ],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
