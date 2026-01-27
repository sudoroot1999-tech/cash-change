import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { LiquidityPool, PoolStatus } from '../entities/liquidity-pool.entity';
import { LiquidityPosition, LiquidityPositionStatus } from '../entities/liquidity-position.entity';
import { RewardHistory, RewardType, RewardStatus } from '../entities/reward-history.entity';
import { BlockchainService } from './blockchain.service';
import { LIQUIDITY_POOL_FACTORY_ABI } from './contract-abis';
import { AddLiquidityDto, RemoveLiquidityDto } from '../dto/liquidity.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import BigNumber from 'bignumber.js';

@Injectable()
export class LiquidityService {
  private readonly logger = new Logger(LiquidityService.name);
  private readonly lpFactoryContractAddress: string;

  constructor(
    @InjectRepository(LiquidityPool)
    private liquidityPoolRepo: Repository<LiquidityPool>,
    @InjectRepository(LiquidityPosition)
    private liquidityPositionRepo: Repository<LiquidityPosition>,
    @InjectRepository(RewardHistory)
    private rewardHistoryRepo: Repository<RewardHistory>,
    private blockchainService: BlockchainService,
    private configService: ConfigService,
  ) {
    this.lpFactoryContractAddress = this.configService.get<string>('LP_FACTORY_CONTRACT_ADDRESS', '');
  }

  async createPool(
    token0: string,
    token1: string,
    rewardRate: string,
    feePercentage: string,
  ): Promise<LiquidityPool> {
    // Check if pool already exists
    const pairSymbol = this.generatePairSymbol(token0, token1);
    const existingPool = await this.liquidityPoolRepo.findOne({
      where: { pairSymbol },
    });

    if (existingPool) {
      throw new BadRequestException('Pool already exists');
    }

    // Interact with smart contract
    const contract = await this.blockchainService.getContract(
      this.lpFactoryContractAddress,
      LIQUIDITY_POOL_FACTORY_ABI,
    );

    try {
      const tx = await contract.createPool(
        token0,
        token1,
        this.blockchainService.parseEther(rewardRate),
        parseInt(feePercentage) * 100, // Convert to basis points
      );

      const receipt = await tx.wait();
      this.logger.log(`Pool creation transaction confirmed: ${receipt.hash}`);

      // Extract pool info from events
      const poolCreatedEvent = receipt.logs.find(
        (log: any) => log.fragment?.name === 'PoolCreated',
      );
      
      const lpTokenAddress = poolCreatedEvent?.args?.lpToken || '0x...';

      // Save to database
      const pool = this.liquidityPoolRepo.create({
        token0,
        token1,
        pairSymbol,
        reserve0: '0',
        reserve1: '0',
        tvl: '0',
        apr: '0',
        totalLpTokens: '0',
        totalRewardsDistributed: '0',
        lpTokenAddress,
        contractAddress: this.lpFactoryContractAddress,
        status: PoolStatus.ACTIVE,
        feePercentage,
      });

      return await this.liquidityPoolRepo.save(pool);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to create pool: ${err.message}`, err.stack);
      throw new BadRequestException('Failed to create liquidity pool');
    }
  }

  async addLiquidity(userId: string, addLiquidityDto: AddLiquidityDto): Promise<LiquidityPosition> {
    const { token0, token1, amount0, amount1, minLiquidity } = addLiquidityDto;

    const pairSymbol = this.generatePairSymbol(token0, token1);
    const pool = await this.liquidityPoolRepo.findOne({
      where: { pairSymbol, status: PoolStatus.ACTIVE },
    });

    if (!pool) {
      throw new NotFoundException('Liquidity pool not found');
    }

    // Interact with smart contract
    const contract = await this.blockchainService.getContract(
      this.lpFactoryContractAddress,
      LIQUIDITY_POOL_FACTORY_ABI,
    );

    try {
      const poolId = '0x...'; // Should be retrieved from pool
      
      const tx = await contract.addLiquidity(
        poolId,
        this.blockchainService.parseEther(amount0),
        this.blockchainService.parseEther(amount1),
        this.blockchainService.parseEther(minLiquidity),
      );

      const receipt = await tx.wait();
      this.logger.log(`Add liquidity transaction confirmed: ${receipt.hash}`);

      // Calculate LP tokens received (simplified)
      const lpTokenAmount = new BigNumber(amount0).multipliedBy(amount1).sqrt().toString();

      // Update pool reserves
      pool.reserve0 = new BigNumber(pool.reserve0).plus(amount0).toString();
      pool.reserve1 = new BigNumber(pool.reserve1).plus(amount1).toString();
      pool.totalLpTokens = new BigNumber(pool.totalLpTokens).plus(lpTokenAmount).toString();
      pool.tvl = await this.calculateTVL(pool);
      await this.liquidityPoolRepo.save(pool);

      // Check if user already has a position in this pool
      let position = await this.liquidityPositionRepo.findOne({
        where: { userId, poolId: pool.id, status: LiquidityPositionStatus.ACTIVE },
      });

      if (position) {
        // Update existing position
        position.lpTokenAmount = new BigNumber(position.lpTokenAmount).plus(lpTokenAmount).toString();
        position.token0Amount = new BigNumber(position.token0Amount).plus(amount0).toString();
        position.token1Amount = new BigNumber(position.token1Amount).plus(amount1).toString();
      } else {
        // Create new position
        position = this.liquidityPositionRepo.create({
          userId,
          poolId: pool.id,
          lpTokenAmount,
          token0Amount: amount0,
          token1Amount: amount1,
          farmingRewards: '0',
          impermanentLoss: '0',
          status: LiquidityPositionStatus.ACTIVE,
          autoHarvest: false,
          autoRestake: false,
          addLiquidityTxHash: receipt.hash,
        });
      }

      return await this.liquidityPositionRepo.save(position);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to add liquidity: ${err.message}`, err.stack);
      throw new BadRequestException('Failed to add liquidity');
    }
  }

  async removeLiquidity(userId: string, removeLiquidityDto: RemoveLiquidityDto): Promise<LiquidityPosition> {
    const { poolId, liquidity, minAmount0, minAmount1 } = removeLiquidityDto;

    const position = await this.liquidityPositionRepo.findOne({
      where: { userId, poolId, status: LiquidityPositionStatus.ACTIVE },
      relations: ['pool'],
    });

    if (!position) {
      throw new NotFoundException('Liquidity position not found');
    }

    if (new BigNumber(position.lpTokenAmount).isLessThan(liquidity)) {
      throw new BadRequestException('Insufficient liquidity');
    }

    // Interact with smart contract
    const contract = await this.blockchainService.getContract(
      this.lpFactoryContractAddress,
      LIQUIDITY_POOL_FACTORY_ABI,
    );

    try {
      const poolIdBytes = '0x...'; // Convert poolId to bytes32
      
      const tx = await contract.removeLiquidity(
        poolIdBytes,
        this.blockchainService.parseEther(liquidity),
        this.blockchainService.parseEther(minAmount0),
        this.blockchainService.parseEther(minAmount1),
      );

      const receipt = await tx.wait();
      this.logger.log(`Remove liquidity transaction confirmed: ${receipt.hash}`);

      // Calculate amounts removed
      const pool = position.pool;
      const totalLP = new BigNumber(pool.totalLpTokens);
      const lpAmount = new BigNumber(liquidity);
      
      const amount0Removed = lpAmount.multipliedBy(pool.reserve0).dividedBy(totalLP).toString();
      const amount1Removed = lpAmount.multipliedBy(pool.reserve1).dividedBy(totalLP).toString();

      // Update pool
      pool.reserve0 = new BigNumber(pool.reserve0).minus(amount0Removed).toString();
      pool.reserve1 = new BigNumber(pool.reserve1).minus(amount1Removed).toString();
      pool.totalLpTokens = new BigNumber(pool.totalLpTokens).minus(liquidity).toString();
      pool.tvl = await this.calculateTVL(pool);
      await this.liquidityPoolRepo.save(pool);

      // Update position
      position.lpTokenAmount = new BigNumber(position.lpTokenAmount).minus(liquidity).toString();
      position.token0Amount = new BigNumber(position.token0Amount).minus(amount0Removed).toString();
      position.token1Amount = new BigNumber(position.token1Amount).minus(amount1Removed).toString();
      position.removeLiquidityTxHash = receipt.hash;

      if (new BigNumber(position.lpTokenAmount).isZero()) {
        position.status = LiquidityPositionStatus.REMOVED;
      }

      return await this.liquidityPositionRepo.save(position);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to remove liquidity: ${err.message}`, err.stack);
      throw new BadRequestException('Failed to remove liquidity');
    }
  }

  async harvestRewards(userId: string, poolId: string): Promise<string> {
    const position = await this.liquidityPositionRepo.findOne({
      where: { userId, poolId, status: LiquidityPositionStatus.ACTIVE },
      relations: ['pool'],
    });

    if (!position) {
      throw new NotFoundException('Liquidity position not found');
    }

    // Calculate pending rewards
    const pendingRewards = await this.calculatePendingRewards(position);
    
    if (new BigNumber(pendingRewards).isZero()) {
      throw new BadRequestException('No rewards to harvest');
    }

    // Interact with smart contract
    const contract = await this.blockchainService.getContract(
      this.lpFactoryContractAddress,
      LIQUIDITY_POOL_FACTORY_ABI,
    );

    try {
      const poolIdBytes = '0x...';
      
      const tx = await contract.harvestRewards(poolIdBytes);
      const receipt = await tx.wait();
      
      this.logger.log(`Harvest rewards transaction confirmed: ${receipt.hash}`);

      // Update position
      position.farmingRewards = new BigNumber(position.farmingRewards).plus(pendingRewards).toString();
      position.lastHarvestDate = new Date();

      if (position.autoRestake) {
        // Auto-restake logic would go here
        this.logger.log(`Auto-restaking rewards for position ${position.id}`);
      }

      await this.liquidityPositionRepo.save(position);

      // Record reward
      const reward = this.rewardHistoryRepo.create({
        userId,
        rewardType: RewardType.FARMING,
        rewardAsset: 'REWARD_TOKEN',
        amount: pendingRewards,
        sourceId: position.id,
        status: position.autoRestake ? RewardStatus.COMPOUNDED : RewardStatus.CLAIMED,
        transactionHash: receipt.hash,
        claimedAt: new Date(),
      });
      await this.rewardHistoryRepo.save(reward);

      return pendingRewards;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to harvest rewards: ${err.message}`, err.stack);
      throw new BadRequestException('Failed to harvest rewards');
    }
  }

  async getPools(): Promise<LiquidityPool[]> {
    const pools = await this.liquidityPoolRepo.find({
      where: { status: PoolStatus.ACTIVE },
      order: { tvl: 'DESC' },
    });

    // Update APRs
    for (const pool of pools) {
      pool.apr = await this.calculateAPR(pool);
    }

    return pools;
  }

  async getUserPositions(userId: string): Promise<LiquidityPosition[]> {
    const positions = await this.liquidityPositionRepo.find({
      where: { userId },
      relations: ['pool'],
      order: { createdAt: 'DESC' },
    });

    // Calculate impermanent loss and pending rewards
    for (const position of positions) {
      if (position.status === LiquidityPositionStatus.ACTIVE) {
        position.impermanentLoss = await this.calculateImpermanentLoss(position);
        const pendingRewards = await this.calculatePendingRewards(position);
        position.farmingRewards = new BigNumber(position.farmingRewards).plus(pendingRewards).toString();
      }
    }

    return positions;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updatePoolMetrics(): Promise<void> {
    this.logger.log('Updating liquidity pool metrics');

    const pools = await this.liquidityPoolRepo.find({
      where: { status: PoolStatus.ACTIVE },
    });

    for (const pool of pools) {
      try {
        pool.tvl = await this.calculateTVL(pool);
        pool.apr = await this.calculateAPR(pool);
        await this.liquidityPoolRepo.save(pool);
      } catch (error) {
        const err = error as Error;
        this.logger.error(`Failed to update pool ${pool.id}: ${err.message}`);
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async distributeRewards(): Promise<void> {
    this.logger.log('Distributing farming rewards');

    const positions = await this.liquidityPositionRepo.find({
      where: { status: LiquidityPositionStatus.ACTIVE, autoHarvest: true },
      relations: ['pool'],
    });

    for (const position of positions) {
      try {
        const pendingRewards = await this.calculatePendingRewards(position);
        
        if (new BigNumber(pendingRewards).isGreaterThan(0)) {
          await this.harvestRewards(position.userId, position.poolId);
        }
      } catch (error) {
        const err = error as Error;
        this.logger.error(`Failed to auto-harvest for position ${position.id}: ${err.message}`);
      }
    }
  }

  private async calculatePendingRewards(position: LiquidityPosition): Promise<string> {
    const pool = position.pool;
    const now = Date.now();
    const lastHarvest = position.lastHarvestDate?.getTime() || position.createdAt.getTime();
    const timeElapsed = (now - lastHarvest) / 1000; // seconds

    // Simplified reward calculation
    const userShare = new BigNumber(position.lpTokenAmount).dividedBy(pool.totalLpTokens || 1);
    const poolRewardRate = new BigNumber(pool.apr).dividedBy(100).dividedBy(31536000); // per second
    const rewards = userShare.multipliedBy(poolRewardRate).multipliedBy(timeElapsed).multipliedBy(pool.tvl);

    return rewards.toString();
  }

  private async calculateImpermanentLoss(position: LiquidityPosition): Promise<string> {
    const pool = position.pool;

    // Calculate price ratio at deposit
    const initialRatio = new BigNumber(position.token0Amount).dividedBy(position.token1Amount);
    
    // Calculate current price ratio
    const currentRatio = new BigNumber(pool.reserve0).dividedBy(pool.reserve1);

    if (initialRatio.isEqualTo(currentRatio)) {
      return '0';
    }

    // Simplified IL calculation: IL = 2 * sqrt(price_ratio) / (1 + price_ratio) - 1
    const priceChange = currentRatio.dividedBy(initialRatio);
    const sqrtPriceChange = priceChange.sqrt();
    const il = sqrtPriceChange.multipliedBy(2).dividedBy(priceChange.plus(1)).minus(1);

    // Return as percentage
    return il.multipliedBy(100).toString();
  }

  private async calculateTVL(pool: LiquidityPool): Promise<string> {
    // Mock TVL calculation - In production, use price oracle
    const token0Value = new BigNumber(pool.reserve0).multipliedBy(100); // Mock price
    const token1Value = new BigNumber(pool.reserve1).multipliedBy(100);
    return token0Value.plus(token1Value).toString();
  }

  private async calculateAPR(pool: LiquidityPool): Promise<string> {
    // Mock APR calculation
    const tvl = new BigNumber(pool.tvl);
    if (tvl.isZero()) return '0';

    const yearlyRewards = new BigNumber(pool.totalRewardsDistributed);
    const apr = yearlyRewards.dividedBy(tvl).multipliedBy(100);

    return apr.toString();
  }

  private generatePairSymbol(token0: string, token1: string): string {
    return [token0, token1].sort().join('-');
  }
}
