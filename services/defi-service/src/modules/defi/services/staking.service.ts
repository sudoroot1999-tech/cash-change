import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { StakingPosition, StakingType, StakingStatus } from '../entities/staking-position.entity';
import { RewardHistory, RewardType, RewardStatus } from '../entities/reward-history.entity';
import { BlockchainService } from './blockchain.service';
import { STAKING_CONTRACT_ABI } from './contract-abis';
import { StakeDto } from '../dto/staking.dto';
import BigNumber from 'bignumber.js';

@Injectable()
export class StakingService {
  private readonly logger = new Logger(StakingService.name);
  private readonly stakingContractAddress: string;

  constructor(
    @InjectRepository(StakingPosition)
    private stakingPositionRepo: Repository<StakingPosition>,
    @InjectRepository(RewardHistory)
    private rewardHistoryRepo: Repository<RewardHistory>,
    private blockchainService: BlockchainService,
    private configService: ConfigService,
  ) {
    this.stakingContractAddress = this.configService.get<string>('STAKING_CONTRACT_ADDRESS', '');
  }

  async stake(userId: string, stakeDto: StakeDto): Promise<StakingPosition> {
    const { coin, amount, stakingType, lockDays, autoCompound } = stakeDto;

    // Validate lock days for locked staking
    if (stakingType === StakingType.LOCKED) {
      if (!lockDays || ![7, 30, 90, 180].includes(lockDays)) {
        throw new BadRequestException('Invalid lock period. Must be 7, 30, 90, or 180 days');
      }
    }

    // Get APR based on staking type
    const apr = this.getAPR(stakingType, lockDays);

    // Interact with smart contract
    const contract = await this.blockchainService.getContract(
      this.stakingContractAddress,
      STAKING_CONTRACT_ABI,
    );

    try {
      const poolId = 0; // Default pool, can be dynamic
      const lockDaysValue = stakingType === StakingType.FLEXIBLE ? 0 : lockDays;
      
      const tx = await contract.stake(
        poolId,
        this.blockchainService.parseEther(amount),
        lockDaysValue,
        autoCompound,
      );

      const receipt = await tx.wait();
      this.logger.log(`Stake transaction confirmed: ${receipt.hash}`);

      // Save to database
      const positionData = {
        userId,
        coin,
        amount,
        apr: apr.toString(),
        stakingType,
        lockDays: stakingType === StakingType.FLEXIBLE ? null : (lockDays as number),
        startDate: new Date(),
        endDate: stakingType === StakingType.FLEXIBLE 
          ? null 
          : new Date(Date.now() + (lockDays || 0) * 24 * 60 * 60 * 1000),
        autoCompound,
        status: StakingStatus.ACTIVE,
        transactionHash: receipt.hash,
        contractAddress: this.stakingContractAddress,
        rewardsEarned: '0',
      };
      
      const position = this.stakingPositionRepo.create(positionData);
      return await this.stakingPositionRepo.save(position);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to stake: ${err.message}`, err.stack);
      throw new BadRequestException('Failed to stake tokens');
    }
  }

  async unstake(userId: string, positionId: string): Promise<StakingPosition> {
    const position = await this.stakingPositionRepo.findOne({
      where: { id: positionId, userId, status: StakingStatus.ACTIVE },
    });

    if (!position) {
      throw new NotFoundException('Staking position not found');
    }

    // Check if lock period has ended
    if (position.stakingType === StakingType.LOCKED && position.endDate && position.endDate > new Date()) {
      throw new BadRequestException('Stake is still locked');
    }

    // Interact with smart contract
    const contract = await this.blockchainService.getContract(
      this.stakingContractAddress,
      STAKING_CONTRACT_ABI,
    );

    try {
      const poolId = 0;
      const stakeId = 0; // Should be retrieved from contract events
      
      const tx = await contract.unstake(poolId, stakeId);
      const receipt = await tx.wait();
      
      this.logger.log(`Unstake transaction confirmed: ${receipt.hash}`);

      // Update position
      position.status = StakingStatus.UNSTAKED;
      position.unstakedDate = new Date();
      
      await this.stakingPositionRepo.save(position);

      // Record rewards if any
      if (new BigNumber(position.rewardsEarned).isGreaterThan(0)) {
        const reward = this.rewardHistoryRepo.create({
          userId,
          rewardType: RewardType.STAKING,
          rewardAsset: position.coin,
          amount: position.rewardsEarned,
          sourceId: positionId,
          status: RewardStatus.CLAIMED,
          transactionHash: receipt.hash,
          claimedAt: new Date(),
        });
        await this.rewardHistoryRepo.save(reward);
      }

      return position;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to unstake: ${err.message}`, err.stack);
      throw new BadRequestException('Failed to unstake tokens');
    }
  }

  async claimRewards(userId: string, positionId: string): Promise<string> {
    const position = await this.stakingPositionRepo.findOne({
      where: { id: positionId, userId, status: StakingStatus.ACTIVE },
    });

    if (!position) {
      throw new NotFoundException('Staking position not found');
    }

    // Get pending rewards from smart contract
    const contract = await this.blockchainService.getContract(
      this.stakingContractAddress,
      STAKING_CONTRACT_ABI,
    );

    try {
      const poolId = 0;
      const stakeId = 0;
      
      const tx = await contract.claimRewards(poolId, stakeId);
      const receipt = await tx.wait();
      
      this.logger.log(`Claim rewards transaction confirmed: ${receipt.hash}`);

      // Calculate rewards earned
      const rewardsAmount = await this.calculatePendingRewards(position);
      
      // Update position
      const totalRewards = new BigNumber(position.rewardsEarned).plus(rewardsAmount);
      position.rewardsEarned = totalRewards.toString();
      position.lastRewardClaim = new Date();
      
      if (position.autoCompound) {
        // Add rewards to staked amount
        position.amount = new BigNumber(position.amount).plus(rewardsAmount).toString();
      }
      
      await this.stakingPositionRepo.save(position);

      // Record reward
      const reward = this.rewardHistoryRepo.create({
        userId,
        rewardType: RewardType.STAKING,
        rewardAsset: position.coin,
        amount: rewardsAmount,
        sourceId: positionId,
        status: position.autoCompound ? RewardStatus.COMPOUNDED : RewardStatus.CLAIMED,
        transactionHash: receipt.hash,
        claimedAt: new Date(),
      });
      await this.rewardHistoryRepo.save(reward);

      return rewardsAmount;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to claim rewards: ${err.message}`, err.stack);
      throw new BadRequestException('Failed to claim rewards');
    }
  }

  async getStakingPositions(userId: string): Promise<StakingPosition[]> {
    return await this.stakingPositionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getStakingPosition(userId: string, positionId: string): Promise<StakingPosition> {
    const position = await this.stakingPositionRepo.findOne({
      where: { id: positionId, userId },
    });

    if (!position) {
      throw new NotFoundException('Staking position not found');
    }

    // Update pending rewards
    if (position.status === StakingStatus.ACTIVE) {
      const pendingRewards = await this.calculatePendingRewards(position);
      position.rewardsEarned = new BigNumber(position.rewardsEarned).plus(pendingRewards).toString();
    }

    return position;
  }

  private async calculatePendingRewards(position: StakingPosition): Promise<string> {
    const now = Date.now();
    const startTime = position.lastRewardClaim?.getTime() || position.startDate.getTime();
    const timeElapsed = (now - startTime) / 1000; // seconds

    const amount = new BigNumber(position.amount);
    const apr = new BigNumber(position.apr).dividedBy(100);
    const secondsPerYear = 31536000;

    const rewards = amount.multipliedBy(apr).multipliedBy(timeElapsed).dividedBy(secondsPerYear);
    
    return rewards.toString();
  }

  private getAPR(stakingType: StakingType, lockDays?: number): number {
    if (stakingType === StakingType.FLEXIBLE) {
      return parseFloat(this.configService.get<string>('FLEXIBLE_STAKING_APY', '5'));
    }

    switch (lockDays) {
      case 7:
        return parseFloat(this.configService.get<string>('LOCKED_7_DAYS_APY', '8'));
      case 30:
        return parseFloat(this.configService.get<string>('LOCKED_30_DAYS_APY', '12'));
      case 90:
        return parseFloat(this.configService.get<string>('LOCKED_90_DAYS_APY', '18'));
      case 180:
        return parseFloat(this.configService.get<string>('LOCKED_180_DAYS_APY', '25'));
      default:
        return parseFloat(this.configService.get<string>('BASE_STAKING_APY', '5'));
    }
  }

  async getTotalStaked(userId: string): Promise<{ totalStaked: string; totalRewards: string }> {
    const positions = await this.stakingPositionRepo.find({
      where: { userId, status: StakingStatus.ACTIVE },
    });

    let totalStaked = new BigNumber(0);
    let totalRewards = new BigNumber(0);

    for (const position of positions) {
      totalStaked = totalStaked.plus(position.amount);
      const pendingRewards = await this.calculatePendingRewards(position);
      totalRewards = totalRewards.plus(position.rewardsEarned).plus(pendingRewards);
    }

    return {
      totalStaked: totalStaked.toString(),
      totalRewards: totalRewards.toString(),
    };
  }
}
