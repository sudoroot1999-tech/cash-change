import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';
import { NftCollection } from '../../../entities/nft-collection.entity';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { IpfsModule } from '../ipfs/ipfs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NftCollection]),
    BlockchainModule,
    IpfsModule,
  ],
  controllers: [CollectionsController],
  providers: [CollectionsService],
  exports: [CollectionsService],
})
export class CollectionsModule {}
