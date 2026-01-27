import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum XpSource {
  TRADING_VOLUME = 'trading_volume',
  REFERRAL = 'referral',
  DAILY_LOGIN = 'daily_login',
  MISSION_COMPLETE = 'mission_complete',
  CHALLENGE_WIN = 'challenge_win',
  BADGE_EARNED = 'badge_earned',
  SOCIAL_ENGAGEMENT = 'social_engagement',
  EDUCATIONAL_CONTENT = 'educational_content',
  MINI_GAME = 'mini_game',
  MANUAL_ADJUSTMENT = 'manual_adjustment',
  QUIZ_COMPLETED = 'quiz_completed',
  QUIZ_PERFECT_SCORE = 'quiz_perfect_score',
  TREASURE_HUNT_COMPLETED = 'treasure_hunt_completed',
  TREASURE_HUNT_REWARD = 'treasure_hunt_reward',
  SPIN_WHEEL = 'spin_wheel',
  TOURNAMENT_PRIZE = 'tournament_prize',
  PRICE_PREDICTION = 'price_prediction',
  GUILD_CREATED = 'guild_created',
  SIMULATOR_STARTED = 'simulator_started',
  SIMULATOR_PROFITABLE_TRADE = 'simulator_profitable_trade',
  SIMULATOR_GRADUATION = 'simulator_graduation',
  PET_ADOPTED = 'pet_adopted',
  PET_BATTLE_WON = 'pet_battle_won',
}

@Entity('xp_transactions')
@Index(['userId', 'createdAt'])
export class XpTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'int' })
  amount: number;

  @Column({
    type: 'enum',
    enum: XpSource,
  })
  source: XpSource;

  @Column({ name: 'source_id', type: 'varchar', nullable: true })
  sourceId: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
