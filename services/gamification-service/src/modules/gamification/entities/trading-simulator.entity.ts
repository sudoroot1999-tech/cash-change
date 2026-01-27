import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('trading_simulators')
@Index(['userId'])
export class TradingSimulator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ name: 'starting_balance', type: 'decimal', precision: 18, scale: 8, default: 100000 })
  startingBalance: number;

  @Column({ name: 'current_balance', type: 'decimal', precision: 18, scale: 8, default: 100000 })
  currentBalance: number;

  @Column({ name: 'total_pnl', type: 'decimal', precision: 18, scale: 8, default: 0 })
  totalPnl: number;

  @Column({ name: 'total_pnl_percentage', type: 'decimal', precision: 10, scale: 4, default: 0 })
  totalPnlPercentage: number;

  @Column({ name: 'total_trades', type: 'int', default: 0 })
  totalTrades: number;

  @Column({ name: 'winning_trades', type: 'int', default: 0 })
  winningTrades: number;

  @Column({ name: 'losing_trades', type: 'int', default: 0 })
  losingTrades: number;

  @Column({ name: 'win_rate', type: 'decimal', precision: 10, scale: 4, default: 0 })
  winRate: number;

  @Column({ type: 'jsonb', default: {} })
  portfolio: Record<string, any>; // { BTC: 0.5, ETH: 2, ... }

  @Column({ name: 'best_trade', type: 'decimal', precision: 18, scale: 8, default: 0 })
  bestTrade: number;

  @Column({ name: 'worst_trade', type: 'decimal', precision: 18, scale: 8, default: 0 })
  worstTrade: number;

  @Column({ name: 'max_drawdown', type: 'decimal', precision: 10, scale: 4, default: 0 })
  maxDrawdown: number;

  @Column({ name: 'sharpe_ratio', type: 'decimal', precision: 10, scale: 4, default: 0, nullable: true })
  sharpeRatio: number;

  @Column({ name: 'is_graduated', type: 'boolean', default: false })
  isGraduated: boolean;

  @Column({ name: 'graduated_at', type: 'timestamp', nullable: true })
  graduatedAt: Date;

  @Column({ name: 'leaderboard_rank', type: 'int', nullable: true })
  leaderboardRank: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
