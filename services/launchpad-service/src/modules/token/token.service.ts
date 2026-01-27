import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { TokenHolding } from './entities/token-holding.entity';
import { TokenTransaction } from './entities/token-transaction.entity';
import { TokenPrice } from './entities/token-price.entity';
import { BurnHistory } from './entities/burn-history.entity';
import {
  TokenBalanceResponse,
  TokenPriceResponse,
  TokenSupplyResponse,
  FeeDiscountResponse,
} from './dto/token.dto';
import BigNumber from 'bignumber.js';

@Injectable()
export class TokenService {
  private readonly TOTAL_SUPPLY = '1000000000'; // 1 billion tokens
  
  // Fee discount tiers
  private readonly FEE_TIERS = [
    { minBalance: '100', discount: 5 },
    { minBalance: '1000', discount: 10 },
    { minBalance: '10000', discount: 15 },
    { minBalance: '100000', discount: 25 },
  ];

  constructor(
    @InjectRepository(TokenHolding)
    private tokenHoldingRepository: Repository<TokenHolding>,
    @InjectRepository(TokenTransaction)
    private tokenTransactionRepository: Repository<TokenTransaction>,
    @InjectRepository(TokenPrice)
    private tokenPriceRepository: Repository<TokenPrice>,
    @InjectRepository(BurnHistory)
    private burnHistoryRepository: Repository<BurnHistory>,
  ) {}

  async getCurrentPrice(): Promise<TokenPriceResponse> {
    const latestPrice = await this.tokenPriceRepository.findOne({
      where: {},
      order: { timestamp: 'DESC' },
    });

    if (!latestPrice) {
      // Return default values if no price data
      return {
        price: '0',
        priceEth: '0',
        priceBnb: '0',
        volume24h: '0',
        marketCap: '0',
        circulatingSupply: this.TOTAL_SUPPLY,
        change24h: 0,
        timestamp: new Date(),
      };
    }

    // Calculate 24h change
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const previousPrice = await this.tokenPriceRepository.findOne({
      where: {
        timestamp: MoreThan(yesterday),
      },
      order: { timestamp: 'ASC' },
    });

    let change24h = 0;
    if (previousPrice) {
      const current = new BigNumber(latestPrice.price);
      const previous = new BigNumber(previousPrice.price);
      change24h = current.minus(previous).dividedBy(previous).multipliedBy(100).toNumber();
    }

    return {
      price: latestPrice.price,
      priceEth: latestPrice.priceEth,
      priceBnb: latestPrice.priceBnb,
      volume24h: latestPrice.volume24h.toString(),
      marketCap: latestPrice.marketCap,
      circulatingSupply: latestPrice.circulatingSupply,
      change24h,
      timestamp: latestPrice.timestamp,
    };
  }

  async getSupplyInfo(): Promise<TokenSupplyResponse> {
    const totalBurned = await this.getTotalBurned();
    const totalStaked = await this.getTotalStaked();
    const totalLocked = await this.getTotalLocked();

    const circulatingSupply = new BigNumber(this.TOTAL_SUPPLY)
      .minus(totalBurned)
      .toString();

    return {
      totalSupply: this.TOTAL_SUPPLY,
      circulatingSupply,
      totalBurned,
      totalStaked,
      totalLocked,
    };
  }

  async getUserBalance(userId: string): Promise<TokenBalanceResponse> {
    let holding = await this.tokenHoldingRepository.findOne({
      where: { userId },
    });

    if (!holding) {
      // Create new holding record
      holding = this.tokenHoldingRepository.create({
        userId,
        balance: '0',
        lockedBalance: '0',
        stakedBalance: '0',
        totalEarned: '0',
        totalBurned: '0',
        feeDiscountTier: 0,
      });
      await this.tokenHoldingRepository.save(holding);
    }

    const balance = new BigNumber(holding.balance);
    const lockedBalance = new BigNumber(holding.lockedBalance);
    const stakedBalance = new BigNumber(holding.stakedBalance);
    const availableBalance = balance.minus(lockedBalance).minus(stakedBalance);

    const discountInfo = this.calculateFeeDiscount(balance.toString());

    return {
      userId: holding.userId,
      balance: holding.balance,
      lockedBalance: holding.lockedBalance,
      stakedBalance: holding.stakedBalance,
      availableBalance: availableBalance.toString(),
      totalEarned: holding.totalEarned,
      feeDiscountTier: discountInfo.tier,
      feeDiscountPercentage: discountInfo.discount,
    };
  }

  async getFeeDiscount(userId: string): Promise<FeeDiscountResponse> {
    const holding = await this.tokenHoldingRepository.findOne({
      where: { userId },
    });

    if (!holding) {
      return {
        userId,
        tokenBalance: '0',
        discountTier: 0,
        discountPercentage: 0,
        requiredForNextTier: this.FEE_TIERS[0].minBalance,
      };
    }

    const balance = new BigNumber(holding.balance);
    const discountInfo = this.calculateFeeDiscount(balance.toString());

    let requiredForNextTier = '0';
    if (discountInfo.tier < this.FEE_TIERS.length - 1) {
      const nextTier = this.FEE_TIERS[discountInfo.tier + 1];
      requiredForNextTier = new BigNumber(nextTier.minBalance)
        .minus(balance)
        .toString();
    }

    return {
      userId,
      tokenBalance: holding.balance,
      discountTier: discountInfo.tier,
      discountPercentage: discountInfo.discount,
      requiredForNextTier,
    };
  }

  calculateFeeDiscount(balance: string): { tier: number; discount: number } {
    const balanceBN = new BigNumber(balance);
    
    for (let i = this.FEE_TIERS.length - 1; i >= 0; i--) {
      if (balanceBN.isGreaterThanOrEqualTo(this.FEE_TIERS[i].minBalance)) {
        return {
          tier: i,
          discount: this.FEE_TIERS[i].discount,
        };
      }
    }

    return { tier: 0, discount: 0 };
  }

  async getUserTransactions(userId: string, page: number = 1, limit: number = 20) {
    const [transactions, total] = await this.tokenTransactionRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTokenStats() {
    const [totalHolders, totalBurned, totalStaked, latestPrice] = await Promise.all([
      this.tokenHoldingRepository.count({ where: { balance: MoreThan('0') } }),
      this.getTotalBurned(),
      this.getTotalStaked(),
      this.getCurrentPrice(),
    ]);

    const circulatingSupply = new BigNumber(this.TOTAL_SUPPLY).minus(totalBurned);
    const marketCap = circulatingSupply.multipliedBy(latestPrice.price);

    return {
      totalSupply: this.TOTAL_SUPPLY,
      circulatingSupply: circulatingSupply.toString(),
      totalBurned,
      totalStaked,
      totalHolders,
      price: latestPrice.price,
      marketCap: marketCap.toString(),
      volume24h: latestPrice.volume24h,
      change24h: latestPrice.change24h,
    };
  }

  async getBurnHistory(page: number = 1, limit: number = 20) {
    const [burns, total] = await this.burnHistoryRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: burns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTopHolders(limit: number = 100) {
    const holders = await this.tokenHoldingRepository.find({
      where: { balance: MoreThan('0') },
      order: { balance: 'DESC' },
      take: limit,
    });

    return holders.map((holder, index) => ({
      rank: index + 1,
      userId: holder.userId,
      walletAddress: holder.walletAddress,
      balance: holder.balance,
      percentage: new BigNumber(holder.balance)
        .dividedBy(this.TOTAL_SUPPLY)
        .multipliedBy(100)
        .toFixed(4),
    }));
  }

  async getDistributionInfo() {
    return {
      totalSupply: this.TOTAL_SUPPLY,
      distribution: [
        { category: 'Public Sale (IEO)', percentage: 20, amount: '200000000' },
        { category: 'Private Sale', percentage: 15, amount: '150000000' },
        { category: 'Team & Advisors', percentage: 20, amount: '200000000', vesting: '4 years' },
        { category: 'Marketing & Community', percentage: 15, amount: '150000000' },
        { category: 'Liquidity Provision', percentage: 10, amount: '100000000' },
        { category: 'Reserve Fund', percentage: 10, amount: '100000000' },
        { category: 'Ecosystem Development', percentage: 10, amount: '100000000' },
      ],
    };
  }

  private async getTotalBurned(): Promise<string> {
    const result = await this.burnHistoryRepository
      .createQueryBuilder('burn')
      .select('SUM(burn.amount)', 'total')
      .getRawOne();

    return result?.total || '0';
  }

  private async getTotalStaked(): Promise<string> {
    const result = await this.tokenHoldingRepository
      .createQueryBuilder('holding')
      .select('SUM(holding.stakedBalance)', 'total')
      .getRawOne();

    return result?.total || '0';
  }

  private async getTotalLocked(): Promise<string> {
    const result = await this.tokenHoldingRepository
      .createQueryBuilder('holding')
      .select('SUM(holding.lockedBalance)', 'total')
      .getRawOne();

    return result?.total || '0';
  }

  async updateBalance(userId: string, amount: string, operation: 'add' | 'subtract') {
    const holding = await this.tokenHoldingRepository.findOne({ where: { userId } });
    
    if (!holding) {
      throw new NotFoundException('Token holding not found');
    }

    const balance = new BigNumber(holding.balance);
    const newBalance = operation === 'add' 
      ? balance.plus(amount)
      : balance.minus(amount);

    if (newBalance.isLessThan(0)) {
      throw new Error('Insufficient balance');
    }

    holding.balance = newBalance.toString();
    
    // Update fee discount tier
    const discountInfo = this.calculateFeeDiscount(holding.balance);
    holding.feeDiscountTier = discountInfo.tier;

    await this.tokenHoldingRepository.save(holding);
    return holding;
  }
}
