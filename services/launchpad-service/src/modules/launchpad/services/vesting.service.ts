import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { VestingSchedule, VestingType } from '../entities/vesting-schedule.entity';
import { TokenClaim, ClaimStatus } from '../entities/token-claim.entity';
import { UserAllocation, AllocationStatus } from '../entities/user-allocation.entity';
import { SaleRoundService } from './sale-round.service';

@Injectable()
export class VestingService {
  constructor(
    @InjectRepository(VestingSchedule)
    private readonly vestingRepository: Repository<VestingSchedule>,
    @InjectRepository(TokenClaim)
    private readonly claimRepository: Repository<TokenClaim>,
    @InjectRepository(UserAllocation)
    private readonly allocationRepository: Repository<UserAllocation>,
    private readonly saleRoundService: SaleRoundService,
  ) {}

  async createVestingSchedule(allocation: UserAllocation): Promise<VestingSchedule> {
    const saleRound = await this.saleRoundService.findOne(allocation.saleRoundId);

    if (!saleRound.isVestingEnabled) {
      throw new BadRequestException('Vesting is not enabled for this sale');
    }

    const totalAmount = allocation.tokenAmount;
    const tgePercentage = saleRound.tgePercentage || 0;
    const tgeAmount = (BigInt(totalAmount) * BigInt(tgePercentage)) / BigInt(100);

    // Calculate vesting phases
    const phases: Array<{
      phase: number;
      percentage: number;
      amount: string;
      unlockTime: Date;
      claimed: boolean;
    }> = [];
    let remainingAmount = BigInt(totalAmount) - tgeAmount;
    
    if (saleRound.vestingSchedule && saleRound.vestingSchedule.length > 0) {
      // Use custom vesting schedule
      for (const phase of saleRound.vestingSchedule) {
        const phaseAmount = (BigInt(totalAmount) * BigInt(phase.percentage)) / BigInt(100);
        const unlockTime = new Date(
          (saleRound.claimStartTime?.getTime() || Date.now()) + phase.unlockTime * 1000,
        );

        phases.push({
          phase: phases.length + 1,
          percentage: phase.percentage,
          amount: phaseAmount.toString(),
          unlockTime,
          claimed: false,
        });
      }
    } else {
      // Linear vesting
      const vestingDuration = saleRound.vestingDuration || 180; // days
      const cliffDuration = saleRound.vestingCliff || 0; // days
      const numberOfPhases = Math.ceil(vestingDuration / 30); // Monthly phases

      const phaseAmount = remainingAmount / BigInt(numberOfPhases);
      const cliffEndTime = new Date(
        (saleRound.claimStartTime?.getTime() || Date.now()) + cliffDuration * 24 * 60 * 60 * 1000,
      );

      for (let i = 0; i < numberOfPhases; i++) {
        const unlockTime = new Date(
          cliffEndTime.getTime() + i * 30 * 24 * 60 * 60 * 1000,
        );

        phases.push({
          phase: i + 1,
          percentage: (100 - tgePercentage) / numberOfPhases,
          amount: phaseAmount.toString(),
          unlockTime,
          claimed: false,
        });
      }
    }

    const vesting = this.vestingRepository.create({
      userId: allocation.userId,
      projectId: saleRound.projectId,
      allocationId: allocation.id,
      vestingType: VestingType.LINEAR,
      totalAmount: totalAmount,
      claimedAmount: '0',
      remainingAmount: totalAmount,
      startTime: saleRound.claimStartTime || new Date(),
      endTime: new Date(
        (saleRound.claimStartTime?.getTime() || Date.now()) +
          (saleRound.vestingDuration || 180) * 24 * 60 * 60 * 1000,
      ),
      cliffEndTime: saleRound.vestingCliff
        ? new Date(
            (saleRound.claimStartTime?.getTime() || Date.now()) +
              saleRound.vestingCliff * 24 * 60 * 60 * 1000,
          )
        : undefined,
      tgePercentage,
      tgeAmount: tgeAmount.toString(),
      tgeClaimed: false,
      totalPhases: phases.length,
      claimedPhases: 0,
      phases,
    });

    return this.vestingRepository.save(vesting);
  }

  async getClaimableAmount(vestingId: string): Promise<{ amount: string; phases: number[] }> {
    const vesting = await this.vestingRepository.findOne({
      where: { id: vestingId },
    });

    if (!vesting) {
      throw new NotFoundException('Vesting schedule not found');
    }

    const now = new Date();
    let claimableAmount = BigInt(0);
    const claimablePhases: number[] = [];

    // Check TGE
    if (!vesting.tgeClaimed && now >= vesting.startTime) {
      claimableAmount += BigInt(vesting.tgeAmount);
      claimablePhases.push(0); // TGE is phase 0
    }

    // Check cliff
    if (vesting.cliffEndTime && now < vesting.cliffEndTime) {
      return {
        amount: claimableAmount.toString(),
        phases: claimablePhases,
      };
    }

    // Check phases
    for (const phase of vesting.phases) {
      if (!phase.claimed && now >= new Date(phase.unlockTime)) {
        claimableAmount += BigInt(phase.amount);
        claimablePhases.push(phase.phase);
      }
    }

    return {
      amount: claimableAmount.toString(),
      phases: claimablePhases,
    };
  }

  async claimTokens(
    allocationId: string,
    userId: string,
    walletAddress: string,
  ): Promise<TokenClaim[]> {
    // Find allocation
    const allocation = await this.allocationRepository.findOne({
      where: { id: allocationId, userId },
      relations: ['saleRound'],
    });

    if (!allocation) {
      throw new NotFoundException('Allocation not found');
    }

    if (allocation.status !== AllocationStatus.PURCHASED) {
      throw new BadRequestException('Tokens cannot be claimed for this allocation');
    }

    // Find vesting schedule
    const vesting = await this.vestingRepository.findOne({
      where: { allocationId, userId },
    });

    if (!vesting) {
      throw new NotFoundException('Vesting schedule not found');
    }

    // Get claimable amount
    const { amount, phases } = await this.getClaimableAmount(vesting.id);

    if (BigInt(amount) <= BigInt(0)) {
      throw new BadRequestException('No tokens available to claim');
    }

    const claims: TokenClaim[] = [];

    // Create TGE claim if applicable
    if (phases.includes(0) && !vesting.tgeClaimed) {
      const tgeClaim = this.claimRepository.create({
        userId,
        allocationId,
        vestingPhase: 0,
        claimableAmount: vesting.tgeAmount,
        claimedAmount: '0',
        status: ClaimStatus.PENDING,
        unlockTime: vesting.startTime,
        walletAddress,
      });
      claims.push(await this.claimRepository.save(tgeClaim));

      vesting.tgeClaimed = true;
    }

    // Create phase claims
    for (const phaseNum of phases) {
      if (phaseNum === 0) continue; // Skip TGE

      const phase = vesting.phases[phaseNum - 1];
      const claim = this.claimRepository.create({
        userId,
        allocationId,
        vestingPhase: phaseNum,
        claimableAmount: phase.amount,
        claimedAmount: '0',
        status: ClaimStatus.PENDING,
        unlockTime: new Date(phase.unlockTime),
        walletAddress,
      });
      claims.push(await this.claimRepository.save(claim));

      phase.claimed = true;
      phase.claimedAt = new Date();
      vesting.claimedPhases += 1;
    }

    // Update vesting
    const claimedAmount = BigInt(vesting.claimedAmount) + BigInt(amount);
    vesting.claimedAmount = claimedAmount.toString();
    vesting.remainingAmount = (BigInt(vesting.totalAmount) - claimedAmount).toString();
    vesting.lastClaimedAt = new Date();

    await this.vestingRepository.save(vesting);

    return claims;
  }

  async getVestingSchedule(userId: string, projectId?: string): Promise<VestingSchedule[]> {
    const where: any = { userId, isActive: true };
    if (projectId) {
      where.projectId = projectId;
    }

    return this.vestingRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async getPendingClaims(userId: string): Promise<TokenClaim[]> {
    return this.claimRepository.find({
      where: {
        userId,
        status: ClaimStatus.PENDING,
        unlockTime: LessThanOrEqual(new Date()),
      },
      relations: ['allocation', 'allocation.saleRound', 'allocation.saleRound.project'],
      order: { unlockTime: 'ASC' },
    });
  }

  async updateClaimStatus(
    claimId: string,
    status: ClaimStatus,
    transactionHash?: string,
    errorMessage?: string,
  ): Promise<TokenClaim> {
    const claim = await this.claimRepository.findOne({
      where: { id: claimId },
    });

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    claim.status = status;

    if (status === ClaimStatus.COMPLETED) {
      claim.claimedAmount = claim.claimableAmount;
      claim.claimedAt = new Date();
      claim.transactionHash = transactionHash;
    } else if (status === ClaimStatus.FAILED) {
      claim.errorMessage = errorMessage;
      claim.retryCount += 1;
    }

    return this.claimRepository.save(claim);
  }

  async getClaimHistory(userId: string): Promise<TokenClaim[]> {
    return this.claimRepository.find({
      where: { userId },
      relations: ['allocation', 'allocation.saleRound', 'allocation.saleRound.project'],
      order: { createdAt: 'DESC' },
    });
  }

  async getVestingStats(userId?: string): Promise<any> {
    const queryBuilder = this.vestingRepository.createQueryBuilder('vesting');

    if (userId) {
      queryBuilder.where('vesting.userId = :userId', { userId });
    }

    queryBuilder.andWhere('vesting.isActive = :isActive', { isActive: true });

    const vestings = await queryBuilder.getMany();

    const totalAllocated = vestings.reduce(
      (sum, v) => sum + BigInt(v.totalAmount),
      BigInt(0),
    );
    const totalClaimed = vestings.reduce(
      (sum, v) => sum + BigInt(v.claimedAmount),
      BigInt(0),
    );
    const totalRemaining = vestings.reduce(
      (sum, v) => sum + BigInt(v.remainingAmount),
      BigInt(0),
    );

    return {
      totalVestings: vestings.length,
      totalAllocated: totalAllocated.toString(),
      totalClaimed: totalClaimed.toString(),
      totalRemaining: totalRemaining.toString(),
    };
  }
}
