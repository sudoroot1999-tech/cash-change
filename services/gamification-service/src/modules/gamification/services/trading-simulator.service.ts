import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TradingSimulator } from '../entities/trading-simulator.entity';
import { SimulatorTrade, SimulatorTradeType, SimulatorTradeStatus } from '../entities/simulator-trade.entity';
import { LevelService } from './level.service';
import { XpSource } from '../entities/xp-transaction.entity';
import { MarketDataClient } from '@packages/utils';

@Injectable()
export class TradingSimulatorService {
  constructor(
    @InjectRepository(TradingSimulator)
    private simulatorRepository: Repository<TradingSimulator>,
    @InjectRepository(SimulatorTrade)
    private tradeRepository: Repository<SimulatorTrade>,
    private levelService: LevelService,
    private marketDataClient: MarketDataClient,
  ) {}

  async getOrCreateSimulator(userId: string): Promise<TradingSimulator> {
    let simulator = await this.simulatorRepository.findOne({
      where: { userId },
    });

    if (!simulator) {
      simulator = this.simulatorRepository.create({
        userId,
        startingBalance: 100000,
        currentBalance: 100000,
      });
      simulator = await this.simulatorRepository.save(simulator);

      // Award XP for starting simulator
      await this.levelService.addXp(userId, 50, XpSource.SIMULATOR_STARTED);
    }

    return simulator;
  }

  async placeTrade(
    userId: string,
    symbol: string,
    type: SimulatorTradeType,
    quantity: number,
    stopLoss?: number,
    takeProfit?: number,
    notes?: string,
    strategy?: string,
  ): Promise<SimulatorTrade> {
    const simulator = await this.getOrCreateSimulator(userId);
    const currentPrice = await this.fetchCurrentPrice(symbol);

    // Calculate cost
    const cost = quantity * currentPrice;
    const fees = cost * 0.001; // 0.1% fee

    if (type === SimulatorTradeType.BUY) {
      if (simulator.currentBalance < cost + fees) {
        throw new BadRequestException('Insufficient balance');
      }

      simulator.currentBalance -= (cost + fees);
      
      // Update portfolio
      const portfolio = simulator.portfolio || {};
      portfolio[symbol] = (portfolio[symbol] || 0) + quantity;
      simulator.portfolio = portfolio;
    } else {
      // SELL
      const portfolio = simulator.portfolio || {};
      if (!portfolio[symbol] || portfolio[symbol] < quantity) {
        throw new BadRequestException('Insufficient holdings');
      }

      simulator.currentBalance += (cost - fees);
      portfolio[symbol] -= quantity;
      if (portfolio[symbol] === 0) {
        delete portfolio[symbol];
      }
      simulator.portfolio = portfolio;
    }

    const trade = this.tradeRepository.create({
      simulatorId: simulator.id,
      userId,
      symbol,
      type,
      quantity,
      entryPrice: currentPrice,
      fees,
      stopLoss,
      takeProfit,
      notes,
      strategy,
      status: SimulatorTradeStatus.OPEN,
      pnl: 0,
    });

    await this.simulatorRepository.save(simulator);
    return await this.tradeRepository.save(trade);
  }

  async closeTrade(userId: string, tradeId: string): Promise<SimulatorTrade> {
    const trade = await this.tradeRepository.findOne({
      where: { id: tradeId, userId },
    });

    if (!trade) {
      throw new NotFoundException('Trade not found');
    }

    if (trade.status !== SimulatorTradeStatus.OPEN) {
      throw new BadRequestException('Trade is not open');
    }

    const simulator = await this.simulatorRepository.findOne({
      where: { id: trade.simulatorId },
    });

    if (!simulator) {
      throw new NotFoundException('Simulator not found');
    }

    const currentPrice = await this.fetchCurrentPrice(trade.symbol);
    trade.exitPrice = currentPrice;

    // Calculate PnL
    if (trade.type === SimulatorTradeType.BUY) {
      trade.pnl = (currentPrice - trade.entryPrice) * trade.quantity - trade.fees;
    } else {
      trade.pnl = (trade.entryPrice - currentPrice) * trade.quantity - trade.fees;
    }

    trade.pnlPercentage = (trade.pnl / (trade.entryPrice * trade.quantity)) * 100;
    trade.status = SimulatorTradeStatus.CLOSED;
    trade.closedAt = new Date();

    // Update simulator stats
    simulator.totalTrades++;
    simulator.totalPnl += trade.pnl;
    simulator.totalPnlPercentage = (simulator.totalPnl / simulator.startingBalance) * 100;

    if (trade.pnl > 0) {
      simulator.winningTrades++;
      if (trade.pnl > simulator.bestTrade) {
        simulator.bestTrade = trade.pnl;
      }
    } else {
      simulator.losingTrades++;
      if (trade.pnl < simulator.worstTrade) {
        simulator.worstTrade = trade.pnl;
      }
    }

    simulator.winRate = (simulator.winningTrades / simulator.totalTrades) * 100;

    // Award XP based on performance
    if (trade.pnl > 0) {
      const xp = Math.floor(Math.min(trade.pnlPercentage * 10, 100));
      await this.levelService.addXp(userId, xp, XpSource.SIMULATOR_PROFITABLE_TRADE);
    }

    await this.simulatorRepository.save(simulator);
    await this.tradeRepository.save(trade);

    // Check graduation criteria
    await this.checkGraduation(simulator);

    return trade;
  }

  async getPortfolio(userId: string) {
    const simulator = await this.getOrCreateSimulator(userId);
    const portfolio = simulator.portfolio || {};
    
    const portfolioValue = await this.calculatePortfolioValue(portfolio);
    const totalValue = simulator.currentBalance + portfolioValue;
    
    return {
      cash: simulator.currentBalance,
      holdings: portfolio,
      portfolioValue,
      totalValue,
      pnl: totalValue - simulator.startingBalance,
      pnlPercentage: ((totalValue - simulator.startingBalance) / simulator.startingBalance) * 100,
    };
  }

  async getTradeHistory(userId: string, limit: number = 50) {
    const simulator = await this.getOrCreateSimulator(userId);
    
    return await this.tradeRepository.find({
      where: { simulatorId: simulator.id },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getStats(userId: string) {
    const simulator = await this.getOrCreateSimulator(userId);
    const portfolio = await this.getPortfolio(userId);
    
    return {
      totalTrades: simulator.totalTrades,
      winningTrades: simulator.winningTrades,
      losingTrades: simulator.losingTrades,
      winRate: simulator.winRate,
      totalPnl: simulator.totalPnl,
      totalPnlPercentage: simulator.totalPnlPercentage,
      currentValue: portfolio.totalValue,
      bestTrade: simulator.bestTrade,
      worstTrade: simulator.worstTrade,
      isGraduated: simulator.isGraduated,
      graduatedAt: simulator.graduatedAt,
    };
  }

  async getLeaderboard(limit: number = 100) {
    return await this.simulatorRepository
      .createQueryBuilder('simulator')
      .select('simulator.userId', 'userId')
      .addSelect('simulator.totalPnlPercentage', 'pnlPercentage')
      .addSelect('simulator.totalPnl', 'pnl')
      .addSelect('simulator.winRate', 'winRate')
      .addSelect('simulator.totalTrades', 'totalTrades')
      .orderBy('simulator.totalPnlPercentage', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  private async checkGraduation(simulator: TradingSimulator) {
    if (simulator.isGraduated) return;

    // Graduation criteria
    const criteria = {
      minTrades: 50,
      minWinRate: 55,
      minPnlPercentage: 10,
    };

    if (
      simulator.totalTrades >= criteria.minTrades &&
      simulator.winRate >= criteria.minWinRate &&
      simulator.totalPnlPercentage >= criteria.minPnlPercentage
    ) {
      simulator.isGraduated = true;
      simulator.graduatedAt = new Date();
      await this.simulatorRepository.save(simulator);

      // Award graduation bonus
      await this.levelService.addXp(simulator.userId, 500, XpSource.SIMULATOR_GRADUATION);
    }
  }

  private async calculatePortfolioValue(portfolio: Record<string, number>): Promise<number> {
    let totalValue = 0;
    
    for (const [symbol, quantity] of Object.entries(portfolio)) {
      const price = await this.fetchCurrentPrice(symbol);
      totalValue += price * quantity;
    }
    
    return totalValue;
  }

  private async fetchCurrentPrice(symbol: string): Promise<number> {
    // Use market data service for real-time prices
    return await this.marketDataClient.getPrice(symbol);
  }
}
