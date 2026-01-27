import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';

export enum BadgeCategory {
  COURSE = 'course',
  ACHIEVEMENT = 'achievement',
  PARTICIPATION = 'participation',
  MILESTONE = 'milestone',
  SPECIAL = 'special',
}

export enum BadgeRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

export enum BadgeCriteriaType {
  COURSE_COMPLETION = 'course-completion',
  XP_MILESTONE = 'xp-milestone',
  STREAK = 'streak',
  QUIZ_MASTER = 'quiz-master',
  EARLY_BIRD = 'early-bird',
  CONTRIBUTOR = 'contributor',
  MENTOR = 'mentor',
  CUSTOM = 'custom',
}

registerEnumType(BadgeCategory, { name: 'BadgeCategory' });
registerEnumType(BadgeRarity, { name: 'BadgeRarity' });
registerEnumType(BadgeCriteriaType, { name: 'BadgeCriteriaType' });

@ObjectType()
export class BadgeCriteria {
  @Field(() => BadgeCriteriaType)
  type: BadgeCriteriaType;

  @Field({ nullable: true })
  requirement?: string;
}

@ObjectType()
@Entity('badges')
@Index(['category', 'isActive'])
export class Badge {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  name: string;

  @Field()
  @Column({ unique: true })
  slug: string;

  @Field()
  @Column('text')
  description: string;

  @Field()
  @Column()
  icon: string;

  @Field(() => BadgeCategory)
  @Column({ type: 'enum', enum: BadgeCategory })
  category: BadgeCategory;

  @Field(() => BadgeRarity)
  @Column({ type: 'enum', enum: BadgeRarity, default: BadgeRarity.COMMON })
  rarity: BadgeRarity;

  @Field(() => BadgeCriteria)
  @Column('jsonb')
  criteria: BadgeCriteria;

  @Field(() => Int)
  @Column({ default: 0 })
  xpReward: number;

  @Field()
  @Column({ default: true })
  isActive: boolean;

  @Field(() => Int)
  @Column({ default: 0 })
  earnedCount: number;

  @Field(() => Int)
  @Column({ default: 0 })
  order: number;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
