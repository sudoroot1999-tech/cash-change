import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Badge } from './badge.entity';

@ObjectType()
@Entity('user_badges')
@Unique(['userId', 'badgeId'])
export class UserBadge {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  userId: string;

  @Field()
  @Column('uuid')
  badgeId: string;

  @Field()
  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  earnedAt: Date;

  @Field()
  @Column({ default: true })
  displayOnProfile: boolean;

  @Field(() => Int)
  @Column({ default: 0 })
  displayOrder: number;

  @Field({ nullable: true })
  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @Field(() => Badge)
  @ManyToOne(() => Badge, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'badgeId' })
  badge: Badge;
}
