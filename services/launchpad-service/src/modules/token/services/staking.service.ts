import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StakingPosition, StakingStatus } from '../entities/staking-position.entity';
import { TokenHolding } from '../entities/token-holding.entity';
import { TokenTransaction, TransactionType, TransactionStatus } from '../entities/token-transaction.entity';
import { StakeTokenDto, UnstakeTokenDto, ClaimRewardsDto, StakingRewardsResponse } from '../dto/token.dto';
import { BlockchainService } from './blockchain.service';
import BigNumber from 'bignumber.js';

@Injectable()
export class StakingService {
  private readonly STAKING_TIERS = [
    { id: 0, lockDuration: 30 * 24 * 60 * 60, apy: 5 },  // 30 days - 5% APY
    { id: 1, lockDuration: 90 * 24 * 60 * 60, apy: 10 }, // 90 days - 10% APY
    { id: 2, lockDuration: 180 * 24 * 60 * 60, apy: 15 }, // 180 days - 15% APY
    { id: 3, lockDuration: 365 * 24 * 60 * 60, apy: 25 }, // 365 days - 25% APY
  ];

  constructor(
    @InjectRepository(StakingPosition)
    private stakingPositionRepository: Repository<StakingPosition>,
    @InjectRepository(TokenHolding)
    private tokenHoldingRepository: Repository<TokenHolding>,
    @InjectRepository(TokenTransaction)
    private tokenTransactionRepository: Repository<TokenTransaction>,
    private blockchainService: BlockchainService,
  ) {}

  async stakeTokens(userId: string, dto: StakeTokenDto) {
    // Validate tier
    const tier = this.STAKING_TIERS.find(t => t.id === dto.tierId);
    if (!tier) {
      throw new BadRequestException('Invalid staking tier');
    }

    // Check user balance
    const holding = await this.tokenHoldingRepository.findOne({
      where: { userId },
    });

    if (!holding) {
      throw new BadRequestException('No token holdings found');
    }

    const balance = new BigNumber(holding.balance);
    const stakedBalance = new BigNumber(holding.stakedBalance);
    const lockedBalance = new BigNumber(holding.lockedBalance);
    const availableBalance = balance.minus(stakedBalance).minus(lockedBalance);

    if (availableBalance.isLessThan(dto.amount)) {
      throw new BadRequestException('Insufficient available balance');
    }

    // Call blockchain to stake
    const stakeResult = await this.blockchainService.stakeTokens(
      dto.walletAddress,
      dto.amount,
      dto.tierId,
    );

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + tier.lockDuration * 1000);

    // Calculate estimated rewards
    const amountBN = new BigNumber(dto.amount);
    const estimatedRewards = amountBN
      .multipliedBy(tier.apy)
      .dividedBy(100)
      .toString();

    // Create staking position
    const position = this.stakingPositionRepository.create({
      userId,
      stakeId: stakeResult.stakeId,
      amount: dto.amount,
      tierId: dto.tierId,
      lockDuration: tier.lockDuration,
      apyBasisPoints: tier.apy * 100,
      startTime,
      endTime,
      rewardsClaimed: '0',
      estimatedRewards,
      status: StakingStatus.ACTIVE,
      walletAddress: dto.walletAddress,
      txHash: stakeResult.txHash,
    });

    await this.stakingPositionRepository.save(position);

    // Update user holding
    holding.stakedBalance = stakedBalance.plus(dto.amount).toString();
    await this.tokenHoldingRepository.save(holding);

    // Record transaction
    const transaction = this.tokenTransactionRepository.create({
      userId,
      fromAddress: dto.walletAddress,
      toAddress: stakeResult.contractAddress,
      amount: dto.amount,
      type: TransactionType.STAKE,
      status: TransactionStatus.CONFIRMED,
      txHash: stakeResult.txHash,
      blockNumber: stakeResult.blockNumber,
      network: 'ETH',
      metadata: {
        tierId: dto.tierId,
        lockDuration: tier.lockDuration,
        apy: tier.apy,
      },
    });

    await this.tokenTransactionRepository.save(transaction);

    return {
      success: true,
      positionId: position.id,
      txHash: stakeResult.txHash,
      message: 'Tokens staked successfully',
    };
  }

  async unstakeTokens(userId: string, dto: UnstakeTokenDto) {
    const position = await this.stakingPositionRepository.findOne({
      where: { id: dto.positionId, userId },
    });

    if (!position) {
      throw new NotFoundException('Staking position not found');
    }

    if (position.status !== StakingStatus.ACTIVE) {
      throw new BadRequestException('Position is not active');
    }

    const now = new Date();
    if (now < position.endTime) {
      throw new BadRequestException('Lock period has not ended yet');
    }

    // Calculate pending rewards
    const pendingRewards = this.calculateRewards(position);

    // Call blockchain to unstake
    const unstakeResult = await this.blockchainService.unstakeTokens(
      dto.walletAddress,
      position.stakeId,
    );

    // Update position
    position.status = StakingStatus.COMPLETED;
    position.rewardsClaimed = new BigNumber(position.rewardsClaimed)
      .plus(pendingRewards)
      .toString();
    await this.stakingPositionRepository.save(position);

    // Update user holding
    const holding = await this.tokenHoldingRepository.findOne({
      where: { userId },
    });

    if (holding) {
      const stakedBalance = new BigNumber(holding.stakedBalance);
      const totalEarned = new BigNumber(holding.totalEarned);

      holding.stakedBalance = stakedBalance.minus(position.amount).toString();
      holding.totalEarned = totalEarned.plus(pendingRewards).toString();
      await this.tokenHoldingRepository.save(holding);
    }

    // Record transaction
    const transaction = this.tokenTransactionRepository.create({
      userId,
      fromAddress: unstakeResult.contractAddress,
      toAddress: dto.walletAddress,
      amount: new BigNumber(position.amount).plus(pendingRewards).toString(),
      type: TransactionType.UNSTAKE,
      status: TransactionStatus.CONFIRMED,
      txHash: unstakeResult.txHash,
      blockNumber: unstakeResult.blockNumber,
      network: 'ETH',
      metadata: {
        principal: position.amount,
        rewards: pendingRewards,
      },
    });

    await this.tokenTransactionRepository.save(transaction);

    return {
      success: true,
      txHash: unstakeResult.txHash,
      principal: position.amount,
      rewards: pendingRewards,
      message: 'Tokens unstaked successfully',
    };
  }

  async claimRewards(userId: string, dto: ClaimRewardsDto) {
    const position = await this.stakingPositionRepository.findOne({
      where: { id: dto.positionId, userId },
    });

    if (!position) {
      throw new NotFoundException('Staking position not found');
    }

    if (position.status !== StakingStatus.ACTIVE) {
      throw new BadRequestException('Position is not active');
    }

    const pendingRewards = this.calculateRewards(position);
    
    if (new BigNumber(pendingRewards).isLessThanOrEqualTo(0)) {
      throw new BadRequestException('No rewards to claim');
    }

    // Call blockchain to claim rewards
    const claimResult = await this.blockchainService.claimStakingRewards(
      dto.walletAddress,
      position.stakeId,
    );

    // Update position
    position.rewardsClaimed = new BigNumber(position.rewardsClaimed)
      .plus(pendingRewards)
      .toString();
    position.lastRewardClaim = new Date();
    await this.stakingPositionRepository.save(position);

    // Update user holding
    const holding = await this.tokenHoldingRepository.findOne({
      where: { userId },
    });

    if (holding) {
      holding.totalEarned = new BigNumber(holding.totalEarned)
        .plus(pendingRewards)
        .toString();
      await this.tokenHoldingRepository.save(holding);
    }

    // Record transaction
    const transaction = this.tokenTransactionRepository.create({
      userId,
      fromAddress: claimResult.contractAddress,
      toAddress: dto.walletAddress,
      amount: pendingRewards,
      type: TransactionType.REWARD,
      status: TransactionStatus.CONFIRMED,
      txHash: claimResult.txHash,
      blockNumber: claimResult.blockNumber,
      network: 'ETH',
      metadata: {
        positionId: position.id,
        stakeId: position.stakeId,
      },
    });

    await this.tokenTransactionRepository.save(transaction);

    return {
      success: true,
      txHash: claimResult.txHash,
      rewards: pendingRewards,
      message: 'Rewards claimed successfully',
    };
  }

  async getUserStakingPositions(userId: string): Promise<StakingRewardsResponse[]> {
    const positions = await this.stakingPositionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return positions.map(position => ({
      positionId: position.id,
      amount: position.amount,
      tierId: position.tierId,
      apy: position.apyBasisPoints / 100,
      startTime: position.startTime,
      endTime: position.endTime,
      pendingRewards: this.calculateRewards(position),
      claimedRewards: position.rewardsClaimed,
      status: position.status,
    }));
  }

  async getUserPendingRewards(userId: string) {
    const positions = await this.stakingPositionRepository.find({
      where: { userId, status: StakingStatus.ACTIVE },
    });

    let totalPending = new BigNumber(0);

    const rewardsByPosition = positions.map(position => {
      const pending = this.calculateRewards(position);
      totalPending = totalPending.plus(pending);
      
      return {
        positionId: position.id,
        amount: position.amount,
        pendingRewards: pending,
      };
    });

    return {
      totalPending: totalPending.toString(),
      positions: rewardsByPosition,
    };
  }

  private calculateRewards(position: StakingPosition): string {
    if (position.status !== StakingStatus.ACTIVE) {
      return '0';
    }

    const now = new Date();
    const stakingDuration = now > position.endTime
      ? position.endTime.getTime() - position.startTime.getTime()
      : now.getTime() - position.startTime.getTime();

    const stakingSeconds = stakingDuration / 1000;
    const yearSeconds = 365 * 24 * 60 * 60;

    const amount = new BigNumber(position.amount);
    const apy = new BigNumber(position.apyBasisPoints).dividedBy(10000);

    const rewards = amount
      .multipliedBy(apy)
      .multipliedBy(stakingSeconds)
      .dividedBy(yearSeconds);

    const claimedRewards = new BigNumber(position.rewardsClaimed);
    const pendingRewards = rewards.minus(claimedRewards);

    return pendingRewards.isGreaterThan(0) ? pendingRewards.toString() : '0';
  }
}
