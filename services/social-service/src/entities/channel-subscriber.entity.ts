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
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { UserProfile } from './user-profile.entity';
import { Channel } from './channel.entity';

@ObjectType()
@Entity('channel_subscribers')
@Index(['userId'])
@Index(['channelId'])
@Unique(['userId', 'channelId'])
export class ChannelSubscriber {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  userId: string;

  @Field(() => UserProfile, { nullable: true })
  @ManyToOne(() => UserProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId', referencedColumnName: 'userId' })
  user?: UserProfile;

  @Field()
  @Column()
  channelId: string;

  @Field(() => Channel)
  @ManyToOne(() => Channel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channelId' })
  channel: Channel;

  @Field()
  @Column({ default: true })
  notificationsEnabled: boolean;

  @Field()
  @CreateDateColumn()
  subscribedAt: Date;
}
