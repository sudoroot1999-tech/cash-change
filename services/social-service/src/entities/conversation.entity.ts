import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import { ConversationParticipant } from './conversation-participant.entity';
import { Message } from './message.entity';

export enum ConversationType {
  PRIVATE = 'private',
  GROUP = 'group',
}

registerEnumType(ConversationType, { name: 'ConversationType' });

@ObjectType()
@Entity('conversations')
@Index(['type'])
@Index(['updatedAt'])
export class Conversation {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => ConversationType)
  @Column({ type: 'enum', enum: ConversationType, default: ConversationType.PRIVATE })
  type: ConversationType;

  @Field({ nullable: true })
  @Column({ nullable: true, length: 100 })
  name?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  avatarUrl?: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  creatorId?: string;

  @Field(() => Int)
  @Column({ default: 0 })
  participantsCount: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  lastMessageId?: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  lastMessagePreview?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  lastMessageAt?: Date;

  @Field()
  @Column({ default: true })
  isActive: boolean;

  @Field({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  settings?: Record<string, any>;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @Field(() => [ConversationParticipant], { nullable: true })
  @OneToMany(() => ConversationParticipant, (p) => p.conversation)
  participants?: ConversationParticipant[];

  @Field(() => [Message], { nullable: true })
  @OneToMany(() => Message, (m) => m.conversation)
  messages?: Message[];

  // Virtual fields
  @Field(() => Int, { nullable: true })
  unreadCount?: number;
}
