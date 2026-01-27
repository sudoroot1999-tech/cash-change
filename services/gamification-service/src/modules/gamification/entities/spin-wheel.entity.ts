import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SpinWheelType {
  DAILY = 'daily',
  PREMIUM = 'premium',
  EVENT = 'event',
  JACKPOT = 'jackpot',
}

export enum PrizeType {
  TOKENS = 'tokens',
  XP = 'xp',
  FEE_DISCOUNT = 'fee_discount',
  NFT = 'nft',
  BADGE = 'badge',
  NOTHING = 'nothing',
}

@Entity('spin_wheels')
@Index(['userId', 'createdAt'])
export class SpinWheel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({
    name: 'wheel_type',
    type: 'enum',
    enum: SpinWheelType,
  })
  wheelType: SpinWheelType;

  @Column({
    name: 'prize_type',
    type: 'enum',
    enum: PrizeType,
  })
  prizeType: PrizeType;

  @Column({ name: 'prize_value', type: 'jsonb' })
  prizeValue: Record<string, any>;

  @Column({ name: 'tokens_spent', type: 'decimal', precision: 18, scale: 8, default: 0 })
  tokensSpent: number;

  @Column({ name: 'is_jackpot', type: 'boolean', default: false })
  isJackpot: boolean;

  @Column({ name: 'jackpot_multiplier', type: 'decimal', precision: 10, scale: 2, default: 1 })
  jackpotMultiplier: number;

  @Column({ name: 'event_id', type: 'uuid', nullable: true })
  eventId: string;

  @Column({ name: 'spin_result', type: 'int' }) // 0-100 for wheel position
  spinResult: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
