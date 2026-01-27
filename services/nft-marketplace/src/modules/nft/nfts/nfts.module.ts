import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NftsController } from './nfts.controller';
import { NftsService } from './nfts.service';
import { Nft } from '../../../entities/nft.entity';
import { NftTransaction } from '../../../entities/nft-transaction.entity';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { IpfsModule } from '../ipfs/ipfs.module';
import { CollectionsModule } from '../collections/collections.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Nft, NftTransaction]),
    BlockchainModule,
    IpfsModule,
    CollectionsModule,
  ],
  controllers: [NftsController],
  providers: [NftsService],
  exports: [NftsService],
})
export class NftsModule {}
