import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { Webinar } from './webinar.entity';

@ObjectType()
export class RegistrationReminders {
  @Field()
  oneDayBefore: boolean;

  @Field()
  oneHourBefore: boolean;

  @Field()
  tenMinutesBefore: boolean;
}

@ObjectType()
export class RegistrationQuestion {
  @Field()
  question: string;

  @Field()
  askedAt: Date;

  @Field()
  answered: boolean;
}

@ObjectType()
export class RegistrationRating {
  @Field(() => Int)
  overall: number;

  @Field(() => Int)
  content: number;

  @Field(() => Int)
  presentation: number;

  @Field(() => Int)
  interaction: number;

  @Field({ nullable: true })
  comment?: string;

  @Field()
  submittedAt: Date;
}

@ObjectType()
@Entity('webinar_registrations')
@Unique(['userId', 'webinarId'])
export class WebinarRegistration {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  userId: string;

  @Field()
  @Column('uuid')
  webinarId: string;

  @Field()
  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  registeredAt: Date;

  @Field()
  @Column({ default: false })
  attended: boolean;

  @Field(() => Float)
  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  attendancePercentage: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  joinedAt?: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  leftAt?: Date;

  @Field()
  @Column({ default: false })
  certificateIssued: boolean;

  @Field({ nullable: true })
  @Column('uuid', { nullable: true })
  certificateId?: string;

  @Field(() => RegistrationReminders)
  @Column('jsonb', { default: { oneDayBefore: false, oneHourBefore: false, tenMinutesBefore: false } })
  reminders: RegistrationReminders;

  @Field(() => [RegistrationQuestion])
  @Column('jsonb', { default: [] })
  questions: RegistrationQuestion[];

  @Field(() => RegistrationRating, { nullable: true })
  @Column('jsonb', { nullable: true })
  rating?: RegistrationRating;

  @Field(() => Webinar)
  @ManyToOne(() => Webinar, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'webinarId' })
  webinar: Webinar;

  @Field()
  @CreateDateColumn()
  createdAt: Date;
}
