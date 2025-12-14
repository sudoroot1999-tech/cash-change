import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP_LOSS = 'stop_loss',
  STOP_LIMIT = 'stop_limit',
  TRAILING_STOP = 'trailing_stop',
}

export enum OrderStatus {
  PENDING = 'pending',
  OPEN = 'open',
  PARTIAL = 'partial',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

export enum TimeInForce {
  GTC = 'GTC',
  IOC = 'IOC',
  FOK = 'FOK',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Index()
  @Column({ name: 'pair_id', type: 'uuid' })
  pairId!: string;

  @Column({ type: 'enum', enum: OrderSide })
  side!: OrderSide;

  @Column({ type: 'enum', enum: OrderType })
  type!: OrderType;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status!: OrderStatus;

  @Column({ type: 'decimal', precision: 36, scale: 18, nullable: true })
  price!: string | null;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  quantity!: string;

  @Column({ name: 'filled_quantity', type: 'decimal', precision: 36, scale: 18, default: '0' })
  filledQuantity!: string;

  @Column({ name: 'remaining_quantity', type: 'decimal', precision: 36, scale: 18 })
  remainingQuantity!: string;

  @Column({ name: 'stop_price', type: 'decimal', precision: 36, scale: 18, nullable: true })
  stopPrice!: string | null;

  @Column({ name: 'time_in_force', type: 'enum', enum: TimeInForce, default: TimeInForce.GTC })
  timeInForce!: TimeInForce;

  @Column({ name: 'client_order_id', length: 100, nullable: true })
  clientOrderId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
