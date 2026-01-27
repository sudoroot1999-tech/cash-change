import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TradingSimulator } from './trading-simulator.entity';

export enum SimulatorTradeType {
  BUY = 'buy',
  SELL = 'sell',
}

export enum SimulatorTradeStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

@Entity('simulator_trades')
@Index(['simulatorId', 'createdAt'])
@Index(['userId', 'status'])
export class SimulatorTrade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'simulator_id', type: 'uuid' })
  @Index()
  simulatorId: string;

  @ManyToOne(() => TradingSimulator)
  @JoinColumn({ name: 'simulator_id' })
  simulator: TradingSimulator;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 20 })
  symbol: string;

  @Column({
    type: 'enum',
    enum: SimulatorTradeType,
  })
  type: SimulatorTradeType;

  @Column({
    type: 'enum',
    enum: SimulatorTradeStatus,
    default: SimulatorTradeStatus.OPEN,
  })
  status: SimulatorTradeStatus;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  quantity: number;

  @Column({ name: 'entry_price', type: 'decimal', precision: 18, scale: 8 })
  entryPrice: number;

  @Column({ name: 'exit_price', type: 'decimal', precision: 18, scale: 8, nullable: true })
  exitPrice: number;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  pnl: number;

  @Column({ name: 'pnl_percentage', type: 'decimal', precision: 10, scale: 4, default: 0 })
  pnlPercentage: number;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  fees: number;

  @Column({ name: 'stop_loss', type: 'decimal', precision: 18, scale: 8, nullable: true })
  stopLoss: number;

  @Column({ name: 'take_profit', type: 'decimal', precision: 18, scale: 8, nullable: true })
  takeProfit: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  strategy: string;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
