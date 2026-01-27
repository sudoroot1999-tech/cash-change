import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum RatingType {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
}

@Entity('user_ratings')
@Index(['ratedUserId'])
@Index(['tradeId'])
@Index(['createdAt'])
export class UserRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'trade_id' })
  @Index()
  tradeId: string;

  @Column({ name: 'rated_user_id' })
  @Index()
  ratedUserId: string;

  @Column({ name: 'rater_user_id' })
  raterUserId: string;

  @Column({
    type: 'enum',
    enum: RatingType,
  })
  type: RatingType;

  @Column({
    type: 'int',
    comment: '1-5 stars',
  })
  rating: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  comment: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  anonymous: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
