import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum BattleStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('pet_battles')
@Index(['challengerId', 'createdAt'])
@Index(['opponentId', 'createdAt'])
export class PetBattle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'challenger_id', type: 'uuid' })
  @Index()
  challengerId: string;

  @Column({ name: 'challenger_pet_id', type: 'uuid' })
  challengerPetId: string;

  @Column({ name: 'opponent_id', type: 'uuid' })
  @Index()
  opponentId: string;

  @Column({ name: 'opponent_pet_id', type: 'uuid' })
  opponentPetId: string;

  @Column({
    type: 'enum',
    enum: BattleStatus,
    default: BattleStatus.PENDING,
  })
  status: BattleStatus;

  @Column({ name: 'winner_id', type: 'uuid', nullable: true })
  winnerId: string;

  @Column({ name: 'battle_log', type: 'jsonb', nullable: true })
  battleLog: Record<string, any>[];

  @Column({ name: 'xp_reward', type: 'int', default: 0 })
  xpReward: number;

  @Column({ name: 'token_reward', type: 'decimal', precision: 18, scale: 8, default: 0 })
  tokenReward: number;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
