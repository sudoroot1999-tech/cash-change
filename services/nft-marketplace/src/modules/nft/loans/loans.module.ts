import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { NftLoan } from '../../../entities/nft-loan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NftLoan])],
  controllers: [LoansController],
  providers: [LoansService],
  exports: [LoansService],
})
export class LoansModule {}
