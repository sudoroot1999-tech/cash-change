import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class UserLearningStreak {
  @Field(() => Int)
  current: number;

  @Field(() => Int)
  longest: number;

  @Field()
  lastActivityDate: Date;
}

@ObjectType()
export class UserRankings {
  @Field(() => Int)
  global: number;

  @Field(() => Int)
  weekly: number;

  @Field(() => Int)
  monthly: number;
}

@ObjectType()
export class UserSkill {
  @Field()
  name: string;

  @Field(() => Int)
  level: number;

  @Field(() => Int)
  xp: number;
}

@ObjectType()
export class UserAchievements {
  @Field()
  firstCourse: boolean;

  @Field()
  firstCertificate: boolean;

  @Field()
  tenCoursesCompleted: boolean;

  @Field()
  fiftyCoursesCompleted: boolean;

  @Field()
  hundredCoursesCompleted: boolean;

  @Field()
  weekStreak: boolean;

  @Field()
  monthStreak: boolean;

  @Field()
  yearStreak: boolean;

  @Field()
  perfectQuizScore: boolean;

  @Field()
  communityHelper: boolean;
}

@ObjectType()
@Entity('user_stats')
@Index(['totalXP'])
export class UserStats {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ unique: true })
  userId: string;

  @Field(() => Int)
  @Column({ default: 0 })
  totalXP: number;

  @Field(() => Int)
  @Column({ default: 1 })
  level: number;

  @Field(() => Int)
  @Column({ default: 0 })
  coursesEnrolled: number;

  @Field(() => Int)
  @Column({ default: 0 })
  coursesInProgress: number;

  @Field(() => Int)
  @Column({ default: 0 })
  coursesCompleted: number;

  @Field(() => Int)
  @Column({ default: 0 })
  lessonsCompleted: number;

  @Field(() => Int)
  @Column({ default: 0 })
  quizzesTaken: number;

  @Field(() => Int)
  @Column({ default: 0 })
  quizzesPassed: number;

  @Field(() => Int)
  @Column({ default: 0 })
  certificatesEarned: number;

  @Field(() => Int)
  @Column({ default: 0 })
  badgesEarned: number;

  @Field(() => Int)
  @Column({ default: 0 })
  webinarsAttended: number;

  @Field(() => Int)
  @Column({ default: 0 })
  timeSpent: number;

  @Field(() => UserLearningStreak)
  @Column('jsonb', { default: { current: 0, longest: 0, lastActivityDate: new Date() } })
  learningStreak: UserLearningStreak;

  @Field(() => UserRankings)
  @Column('jsonb', { default: { global: 0, weekly: 0, monthly: 0 } })
  rankings: UserRankings;

  @Field(() => [UserSkill])
  @Column('jsonb', { default: [] })
  skills: UserSkill[];

  @Field(() => UserAchievements)
  @Column('jsonb', {
    default: {
      firstCourse: false,
      firstCertificate: false,
      tenCoursesCompleted: false,
      fiftyCoursesCompleted: false,
      hundredCoursesCompleted: false,
      weekStreak: false,
      monthStreak: false,
      yearStreak: false,
      perfectQuizScore: false,
      communityHelper: false,
    },
  })
  achievements: UserAchievements;

  @Field()
  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  lastUpdated: Date;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
