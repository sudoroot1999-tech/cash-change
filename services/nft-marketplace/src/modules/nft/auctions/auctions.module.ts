import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionsController } from './auctions.controller';
import { AuctionsService } from './auctions.service';
import { NftListing } from '../../../entities/nft-listing.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NftListing])],
  controllers: [AuctionsController],
  providers: [AuctionsService],
  exports: [AuctionsService],
})
export class AuctionsModule {}
