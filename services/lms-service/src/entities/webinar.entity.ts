import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, Int, Float, registerEnumType } from '@nestjs/graphql';

export enum WebinarStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}

export enum WebinarPlatform {
  ZOOM = 'zoom',
  YOUTUBE_LIVE = 'youtube-live',
  CUSTOM = 'custom',
}

registerEnumType(WebinarStatus, { name: 'WebinarStatus' });
registerEnumType(WebinarPlatform, { name: 'WebinarPlatform' });

@ObjectType()
export class WebinarHost {
  @Field()
  userId: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  bio?: string;
}

@ObjectType()
export class WebinarCoHost {
  @Field()
  userId: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  avatar?: string;
}

@ObjectType()
export class WebinarAgendaItem {
  @Field()
  time: string;

  @Field()
  topic: string;

  @Field(() => Int)
  duration: number;

  @Field({ nullable: true })
  speaker?: string;
}

@ObjectType()
export class WebinarResource {
  @Field()
  title: string;

  @Field()
  url: string;

  @Field()
  type: string;
}

@ObjectType()
export class WebinarCertificate {
  @Field()
  enabled: boolean;

  @Field({ nullable: true })
  title?: string;

  @Field(() => Int)
  minimumAttendance: number;
}

@ObjectType()
export class WebinarReminders {
  @Field()
  oneDayBefore: boolean;

  @Field()
  oneHourBefore: boolean;

  @Field()
  tenMinutesBefore: boolean;
}

@ObjectType()
export class WebinarRating {
  @Field(() => Float)
  average: number;

  @Field(() => Int)
  count: number;
}

@ObjectType()
@Entity('webinars')
@Index(['scheduledAt', 'status'])
@Index(['category'])
export class Webinar {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column({ unique: true })
  slug: string;

  @Field()
  @Column('text')
  description: string;

  @Field(() => WebinarHost)
  @Column('jsonb')
  host: WebinarHost;

  @Field(() => [WebinarCoHost])
  @Column('jsonb', { default: [] })
  coHosts: WebinarCoHost[];

  @Field({ nullable: true })
  @Column({ nullable: true })
  thumbnail?: string;

  @Field()
  @Column()
  category: string;

  @Field(() => [String])
  @Column('simple-array', { default: '' })
  tags: string[];

  @Field()
  @Column()
  scheduledAt: Date;

  @Field(() => Int)
  @Column()
  duration: number;

  @Field()
  @Column({ default: 'UTC' })
  timezone: string;

  @Field(() => WebinarPlatform)
  @Column({ type: 'enum', enum: WebinarPlatform })
  platform: WebinarPlatform;

  @Field({ nullable: true })
  @Column({ nullable: true })
  meetingUrl?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  meetingId?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  meetingPassword?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  streamUrl?: string;

  @Field(() => WebinarStatus)
  @Column({ type: 'enum', enum: WebinarStatus, default: WebinarStatus.SCHEDULED })
  status: WebinarStatus;

  @Field()
  @Column({ default: true })
  isRecorded: boolean;

  @Field({ nullable: true })
  @Column({ nullable: true })
  recordingUrl?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  recordingPublishedAt?: Date;

  @Field(() => Int, { nullable: true })
  @Column({ nullable: true })
  maxAttendees?: number;

  @Field(() => Int)
  @Column({ default: 0 })
  registrations: number;

  @Field(() => Int)
  @Column({ default: 0 })
  attendees: number;

  @Field(() => Float)
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  price: number;

  @Field()
  @Column({ default: true })
  isFree: boolean;

  @Field(() => [WebinarAgendaItem])
  @Column('jsonb', { default: [] })
  agenda: WebinarAgendaItem[];

  @Field(() => [String])
  @Column('simple-array', { default: '' })
  learningObjectives: string[];

  @Field(() => [String])
  @Column('simple-array', { default: '' })
  requirements: string[];

  @Field(() => [WebinarResource])
  @Column('jsonb', { default: [] })
  resources: WebinarResource[];

  @Field(() => WebinarCertificate)
  @Column('jsonb', { default: { enabled: false, minimumAttendance: 75 } })
  certificate: WebinarCertificate;

  @Field(() => WebinarReminders)
  @Column('jsonb', { default: { oneDayBefore: true, oneHourBefore: true, tenMinutesBefore: true } })
  reminders: WebinarReminders;

  @Field(() => WebinarRating)
  @Column('jsonb', { default: { average: 0, count: 0 } })
  rating: WebinarRating;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
