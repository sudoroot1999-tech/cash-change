import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NftLoan, LoanStatus } from '../../../entities/nft-loan.entity';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(NftLoan)
    private loansRepository: Repository<NftLoan>,
  ) {}

  async requestLoan(data: {
    nftId: string;
    borrowerAddress: string;
    loanAmount: string;
    interestRate: number;
    duration: number;
    chainId: number;
  }) {
    const loan = this.loansRepository.create({
      nftId: data.nftId,
      borrowerAddress: data.borrowerAddress.toLowerCase(),
      loanAmount: data.loanAmount,
      interestRate: data.interestRate,
      loanDuration: data.duration,
      chainId: data.chainId,
    });

    return await this.loansRepository.save(loan);
  }

  async acceptLoan(loanId: string, lenderAddress: string) {
    const loan = await this.loansRepository.findOne({ where: { id: loanId } });
    if (loan) {
      loan.lenderAddress = lenderAddress.toLowerCase();
      loan.status = LoanStatus.ACTIVE;
      loan.startTime = new Date();
      loan.endTime = new Date(Date.now() + loan.loanDuration * 1000);
      return await this.loansRepository.save(loan);
    }
    return null;
  }

  async repayLoan(loanId: string) {
    const loan = await this.loansRepository.findOne({ where: { id: loanId } });
    if (loan) {
      loan.status = LoanStatus.REPAID;
      return await this.loansRepository.save(loan);
    }
    return null;
  }

  async liquidateLoan(loanId: string) {
    const loan = await this.loansRepository.findOne({ where: { id: loanId } });
    if (loan) {
      loan.status = LoanStatus.LIQUIDATED;
      return await this.loansRepository.save(loan);
    }
    return null;
  }

  async getUserLoans(userAddress: string) {
    return await this.loansRepository.find({
      where: [
        { borrowerAddress: userAddress.toLowerCase() },
        { lenderAddress: userAddress.toLowerCase() },
      ],
      relations: ['nft'],
    });
  }
}
