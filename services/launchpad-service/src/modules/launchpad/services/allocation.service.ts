import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAllocation, AllocationStatus } from '../entities/user-allocation.entity';
import { SaleRoundService } from './sale-round.service';
import { WhitelistService } from './whitelist.service';
import { StakingService } from './staking.service';
import { SaleStatus, SaleType } from '../entities/sale-round.entity';
import { ParticipateDto } from '../dto/participate.dto';
import * as crypto from 'crypto';

@Injectable()
export class AllocationService {
  constructor(
    @InjectRepository(UserAllocation)
    private readonly allocationRepository: Repository<UserAllocation>,
    private readonly saleRoundService: SaleRoundService,
    private readonly whitelistService: WhitelistService,
    private readonly stakingService: StakingService,
  ) {}

  async participate(participateDto: ParticipateDto, userId: string): Promise<UserAllocation> {
    const { saleRoundId, amount } = participateDto;

    // Get sale round details
    const saleRound = await this.saleRoundService.findOne(saleRoundId);

    // Validate sale is live
    if (saleRound.status !== SaleStatus.SALE_LIVE) {
      throw new BadRequestException('Sale is not currently active');
    }

    // Check if user is whitelisted
    const whitelist = await this.whitelistService.findByUserAndRound(userId, saleRoundId);
    if (!whitelist || !whitelist.isEligible) {
      throw new BadRequestException('You are not whitelisted for this sale');
    }

    // Validate KYC if required
    if (saleRound.kycRequired && !whitelist.kycCompleted) {
      throw new BadRequestException('KYC verification is required');
    }

    // Validate staking requirement
    if (saleRound.stakingRequired) {
      const hasStaking = await this.stakingService.checkStakingRequirement(
        userId,
        saleRound.minStakingAmount || '0',
        saleRound.minStakingDays || 0,
      );
      if (!hasStaking) {
        throw new BadRequestException('Staking requirement not met');
      }
    }

    // Check if user already has allocation
    let allocation = await this.allocationRepository.findOne({
      where: { userId, saleRoundId },
    });

    if (allocation && allocation.status === AllocationStatus.PURCHASED) {
      throw new BadRequestException('You have already participated in this sale');
    }

    // Validate amount
    const minAllocation = parseFloat(saleRound.minAllocation);
    const maxAllocation = parseFloat(saleRound.maxAllocation);

    if (amount < minAllocation || amount > maxAllocation) {
      throw new BadRequestException(
        `Allocation must be between ${minAllocation} and ${maxAllocation}`,
      );
    }

    // Get user tier and multiplier
    const userTier = whitelist.userTier || 1;
    const multiplier = this.getTierMultiplier(saleRound, userTier);

    // Calculate token amount based on current price
    const currentPrice = await this.saleRoundService.getCurrentPrice(saleRoundId);
    const tokenAmount = (amount / parseFloat(currentPrice)).toString();

    if (!allocation) {
      allocation = this.allocationRepository.create({
        userId,
        saleRoundId,
        isWhitelisted: true,
        whitelistedAt: new Date(),
      });
    }

    allocation.allocationAmount = amount.toString();
    allocation.contributedAmount = amount.toString();
    allocation.tokenAmount = tokenAmount;
    allocation.userTier = userTier;
    allocation.allocationMultiplier = multiplier.toString();
    allocation.status = AllocationStatus.PURCHASED;
    allocation.purchasedAt = new Date();

    // For lottery type, just mark as allocated, actual allocation happens later
    if (saleRound.saleType === SaleType.LOTTERY) {
      allocation.status = AllocationStatus.ALLOCATED;
      allocation.lotteryTickets = Math.floor(amount / parseFloat(saleRound.minAllocation));
    }

    const savedAllocation = await this.allocationRepository.save(allocation);

    // Update sale round stats
    await this.saleRoundService.incrementParticipantCount(saleRoundId);

    return savedAllocation;
  }

  async runLottery(saleRoundId: string): Promise<void> {
    const saleRound = await this.saleRoundService.findOne(saleRoundId);

    if (saleRound.saleType !== SaleType.LOTTERY) {
      throw new BadRequestException('This sale is not a lottery type');
    }

    if (saleRound.lotteryCompleted) {
      throw new BadRequestException('Lottery has already been completed');
    }

    // Get all allocated participants
    const allocations = await this.allocationRepository.find({
      where: { saleRoundId, status: AllocationStatus.ALLOCATED },
    });

    if (allocations.length === 0) {
      throw new BadRequestException('No participants found');
    }

    // Calculate number of winners based on hard cap
    const hardCap = parseFloat(saleRound.hardCap);
    const avgAllocation = parseFloat(saleRound.maxAllocation);
    const maxWinners = Math.floor(hardCap / avgAllocation);

    // Run lottery algorithm
    const winners = this.selectLotteryWinners(allocations, maxWinners);

    // Update winners
    for (const allocation of allocations) {
      const isWinner = winners.includes(allocation.id);
      allocation.wonLottery = isWinner;
      allocation.status = isWinner ? AllocationStatus.PURCHASED : AllocationStatus.NOT_ALLOCATED;
      allocation.lotteryHash = this.generateLotteryHash(allocation.id, saleRoundId);
      await this.allocationRepository.save(allocation);
    }

    // Update sale round
    await this.saleRoundService.updateStatus(saleRoundId, SaleStatus.ALLOCATION_DONE);
    await this.saleRoundRepository.update(saleRoundId, {
      lotteryCompleted: true,
      winnerCount: winners.length,
    });
  }

  private selectLotteryWinners(allocations: UserAllocation[], maxWinners: number): string[] {
    // Weighted random selection based on lottery tickets
    const winners: string[] = [];
    const participants = [...allocations];

    while (winners.length < maxWinners && participants.length > 0) {
      const totalTickets = participants.reduce(
        (sum, p) => sum + (p.lotteryTickets || 1),
        0,
      );

      // Generate random number
      const randomValue = Math.random() * totalTickets;
      let cumulativeTickets = 0;

      for (let i = 0; i < participants.length; i++) {
        cumulativeTickets += participants[i].lotteryTickets || 1;
        if (randomValue <= cumulativeTickets) {
          winners.push(participants[i].id);
          participants.splice(i, 1);
          break;
        }
      }
    }

    return winners;
  }

  private generateLotteryHash(allocationId: string, saleRoundId: string): string {
    return crypto
      .createHash('sha256')
      .update(`${allocationId}-${saleRoundId}-${Date.now()}`)
      .digest('hex');
  }

  private getTierMultiplier(saleRound: any, tier: number): number {
    if (!saleRound.tierMultipliers) {
      return 1;
    }

    const key = `tier${tier}` as keyof typeof saleRound.tierMultipliers;
    return saleRound.tierMultipliers[key] || 1;
  }

  async findByUser(userId: string): Promise<UserAllocation[]> {
    return this.allocationRepository.find({
      where: { userId },
      relations: ['saleRound', 'saleRound.project'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<UserAllocation> {
    const allocation = await this.allocationRepository.findOne({
      where: { id },
      relations: ['saleRound', 'saleRound.project'],
    });

    if (!allocation) {
      throw new NotFoundException('Allocation not found');
    }

    return allocation;
  }

  async getUserAllocationForRound(userId: string, saleRoundId: string): Promise<UserAllocation | null> {
    return this.allocationRepository.findOne({
      where: { userId, saleRoundId },
      relations: ['saleRound', 'saleRound.project'],
    });
  }

  async getStats(userId?: string): Promise<any> {
    const queryBuilder = this.allocationRepository.createQueryBuilder('allocation');

    if (userId) {
      queryBuilder.where('allocation.userId = :userId', { userId });
    }

    const [total, purchased, allocated, notAllocated] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('allocation.status = :status', { status: AllocationStatus.PURCHASED }).getCount(),
      queryBuilder.clone().andWhere('allocation.status = :status', { status: AllocationStatus.ALLOCATED }).getCount(),
      queryBuilder.clone().andWhere('allocation.status = :status', { status: AllocationStatus.NOT_ALLOCATED }).getCount(),
    ]);

    const totalContributedResult = await queryBuilder
      .select('SUM(CAST(allocation.contributedAmount AS DECIMAL))', 'total')
      .getRawOne();

    return {
      total,
      byStatus: {
        purchased,
        allocated,
        notAllocated,
      },
      totalContributed: totalContributedResult?.total || 0,
    };
  }

  private saleRoundRepository!: Repository<any>;
}
