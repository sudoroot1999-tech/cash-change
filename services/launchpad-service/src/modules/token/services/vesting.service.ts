import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VestingSchedule, VestingStatus, VestingCategory } from '../entities/vesting-schedule.entity';
import { TokenHolding } from '../entities/token-holding.entity';
import { TokenTransaction, TransactionType, TransactionStatus } from '../entities/token-transaction.entity';
import { ClaimVestingDto, VestingInfoResponse } from '../dto/token.dto';
import { BlockchainService } from './blockchain.service';
import BigNumber from 'bignumber.js';

@Injectable()
export class VestingService {
  constructor(
    @InjectRepository(VestingSchedule)
    private vestingScheduleRepository: Repository<VestingSchedule>,
    @InjectRepository(TokenHolding)
    private tokenHoldingRepository: Repository<TokenHolding>,
    @InjectRepository(TokenTransaction)
    private tokenTransactionRepository: Repository<TokenTransaction>,
    private blockchainService: BlockchainService,
  ) {}

  async getUserVestingSchedules(userId: string): Promise<VestingInfoResponse[]> {
    const schedules = await this.vestingScheduleRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return schedules.map(schedule => {
      const vestedAmount = this.calculateVestedAmount(schedule);
      const claimableAmount = new BigNumber(vestedAmount)
        .minus(schedule.releasedAmount)
        .toString();

      return {
        scheduleId: schedule.id,
        category: schedule.category,
        totalAmount: schedule.totalAmount,
        releasedAmount: schedule.releasedAmount,
        vestedAmount,
        claimableAmount,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        status: schedule.status,
      };
    });
  }

  async claimVestedTokens(userId: string, dto: ClaimVestingDto) {
    const schedule = await this.vestingScheduleRepository.findOne({
      where: { id: dto.scheduleId, userId },
    });

    if (!schedule) {
      throw new NotFoundException('Vesting schedule not found');
    }

    if (schedule.status !== VestingStatus.ACTIVE) {
      throw new BadRequestException('Vesting schedule is not active');
    }

    const vestedAmount = this.calculateVestedAmount(schedule);
    const claimableAmount = new BigNumber(vestedAmount)
      .minus(schedule.releasedAmount);

    if (claimableAmount.isLessThanOrEqualTo(0)) {
      throw new BadRequestException('No tokens available to claim');
    }

    // Check cliff period
    const now = new Date();
    const cliffEnd = new Date(
      schedule.startTime.getTime() + schedule.cliffDuration * 1000
    );

    if (now < cliffEnd) {
      throw new BadRequestException('Cliff period has not ended yet');
    }

    // Call blockchain to release vested tokens
    const releaseResult = await this.blockchainService.releaseVestedTokens(
      dto.walletAddress,
      schedule.scheduleId,
    );

    // Update schedule
    schedule.releasedAmount = new BigNumber(schedule.releasedAmount)
      .plus(claimableAmount)
      .toString();
    schedule.lastClaimTime = new Date();

    // Check if fully vested
    if (
      new BigNumber(schedule.releasedAmount).isGreaterThanOrEqualTo(schedule.totalAmount) ||
      now >= schedule.endTime
    ) {
      schedule.status = VestingStatus.COMPLETED;
    }

    await this.vestingScheduleRepository.save(schedule);

    // Update user holding
    const holding = await this.tokenHoldingRepository.findOne({
      where: { userId },
    });

    if (holding) {
      const lockedBalance = new BigNumber(holding.lockedBalance);
      holding.lockedBalance = lockedBalance
        .minus(claimableAmount)
        .toString();
      
      const balance = new BigNumber(holding.balance);
      holding.balance = balance.plus(claimableAmount).toString();

      await this.tokenHoldingRepository.save(holding);
    }

    // Record transaction
    const transaction = this.tokenTransactionRepository.create({
      userId,
      fromAddress: releaseResult.contractAddress,
      toAddress: dto.walletAddress,
      amount: claimableAmount.toString(),
      type: TransactionType.VESTING_CLAIM,
      status: TransactionStatus.CONFIRMED,
      txHash: releaseResult.txHash,
      blockNumber: releaseResult.blockNumber,
      network: 'ETH',
      metadata: {
        scheduleId: schedule.id,
        category: schedule.category,
      },
    });

    await this.tokenTransactionRepository.save(transaction);

    return {
      success: true,
      txHash: releaseResult.txHash,
      claimedAmount: claimableAmount.toString(),
      remainingAmount: new BigNumber(schedule.totalAmount)
        .minus(schedule.releasedAmount)
        .toString(),
      message: 'Vested tokens claimed successfully',
    };
  }

  async createVestingSchedule(
    userId: string,
    category: VestingCategory,
    totalAmount: string,
    walletAddress: string,
    cliffDuration: number,
    vestingDuration: number,
  ) {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + vestingDuration * 1000);

    // Create vesting schedule on blockchain
    const createResult = await this.blockchainService.createVestingSchedule(
      walletAddress,
      totalAmount,
      startTime,
      cliffDuration,
      vestingDuration,
    );

    const schedule = this.vestingScheduleRepository.create({
      userId,
      scheduleId: createResult.scheduleId,
      category,
      totalAmount,
      releasedAmount: '0',
      startTime,
      cliffDuration,
      vestingDuration,
      endTime,
      revocable: category === VestingCategory.TEAM || category === VestingCategory.ADVISOR,
      status: VestingStatus.ACTIVE,
      walletAddress,
    });

    await this.vestingScheduleRepository.save(schedule);

    // Update user holding
    let holding = await this.tokenHoldingRepository.findOne({
      where: { userId },
    });

    if (!holding) {
      holding = this.tokenHoldingRepository.create({
        userId,
        balance: '0',
        lockedBalance: totalAmount,
        stakedBalance: '0',
        totalEarned: '0',
        totalBurned: '0',
        walletAddress,
        feeDiscountTier: 0,
      });
    } else {
      const lockedBalance = new BigNumber(holding.lockedBalance);
      holding.lockedBalance = lockedBalance.plus(totalAmount).toString();
    }

    await this.tokenHoldingRepository.save(holding);

    return {
      success: true,
      scheduleId: schedule.id,
      message: 'Vesting schedule created successfully',
    };
  }

  private calculateVestedAmount(schedule: VestingSchedule): string {
    const now = new Date();

    // Before cliff
    const cliffEnd = new Date(
      schedule.startTime.getTime() + schedule.cliffDuration * 1000
    );
    if (now < cliffEnd) {
      return '0';
    }

    // After vesting period
    if (now >= schedule.endTime || schedule.status === VestingStatus.COMPLETED) {
      return schedule.totalAmount;
    }

    // During vesting period
    const timeFromStart = now.getTime() - schedule.startTime.getTime();
    const vestingDurationMs = schedule.vestingDuration * 1000;

    const totalAmount = new BigNumber(schedule.totalAmount);
    const vestedAmount = totalAmount
      .multipliedBy(timeFromStart)
      .dividedBy(vestingDurationMs);

    return vestedAmount.toString();
  }

  async getVestingStats() {
    const schedules = await this.vestingScheduleRepository.find();

    let totalVesting = new BigNumber(0);
    let totalReleased = new BigNumber(0);
    let totalPending = new BigNumber(0);

    const categorySummary: Record<string, any> = {};

    for (const schedule of schedules) {
      totalVesting = totalVesting.plus(schedule.totalAmount);
      totalReleased = totalReleased.plus(schedule.releasedAmount);

      const vestedAmount = this.calculateVestedAmount(schedule);
      const pendingAmount = new BigNumber(vestedAmount).minus(schedule.releasedAmount);
      totalPending = totalPending.plus(pendingAmount);

      if (!categorySummary[schedule.category]) {
        categorySummary[schedule.category] = {
          total: new BigNumber(0),
          released: new BigNumber(0),
          pending: new BigNumber(0),
        };
      }

      categorySummary[schedule.category].total = 
        categorySummary[schedule.category].total.plus(schedule.totalAmount);
      categorySummary[schedule.category].released = 
        categorySummary[schedule.category].released.plus(schedule.releasedAmount);
      categorySummary[schedule.category].pending = 
        categorySummary[schedule.category].pending.plus(pendingAmount);
    }

    const categoryData = Object.entries(categorySummary).map(([category, data]: [string, any]) => ({
      category,
      total: data.total.toString(),
      released: data.released.toString(),
      pending: data.pending.toString(),
      releasePercentage: data.released.dividedBy(data.total).multipliedBy(100).toFixed(2),
    }));

    return {
      totalVesting: totalVesting.toString(),
      totalReleased: totalReleased.toString(),
      totalPending: totalPending.toString(),
      releasePercentage: totalReleased.dividedBy(totalVesting).multipliedBy(100).toFixed(2),
      byCategory: categoryData,
    };
  }
}
