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
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { UserProfile } from './user-profile.entity';
import { Conversation } from './conversation.entity';

export enum ParticipantRole {
  MEMBER = 'member',
  ADMIN = 'admin',
  OWNER = 'owner',
}

registerEnumType(ParticipantRole, { name: 'ParticipantRole' });

@ObjectType()
@Entity('conversation_participants')
@Index(['userId'])
@Index(['conversationId'])
@Unique(['userId', 'conversationId'])
export class ConversationParticipant {
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
  conversationId: string;

  @Field(() => Conversation)
  @ManyToOne(() => Conversation, (c) => c.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Field(() => ParticipantRole)
  @Column({ type: 'enum', enum: ParticipantRole, default: ParticipantRole.MEMBER })
  role: ParticipantRole;

  @Field({ nullable: true })
  @Column({ nullable: true, length: 50 })
  nickname?: string;

  @Field()
  @Column({ default: true })
  notificationsEnabled: boolean;

  @Field()
  @Column({ default: false })
  isMuted: boolean;

  @Field({ nullable: true })
  @Column({ nullable: true })
  mutedUntil?: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  lastReadMessageId?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  lastReadAt?: Date;

  @Field()
  @CreateDateColumn()
  joinedAt: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  leftAt?: Date;
}
