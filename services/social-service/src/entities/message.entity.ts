import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import { UserProfile } from './user-profile.entity';
import { Conversation } from './conversation.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  FILE = 'file',
  AUDIO = 'audio',
  TRADE_SHARE = 'trade_share',
  SYSTEM = 'system',
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

registerEnumType(MessageType, { name: 'MessageType' });
registerEnumType(MessageStatus, { name: 'MessageStatus' });

@ObjectType()
@Entity('messages')
@Index(['conversationId', 'createdAt'])
@Index(['senderId'])
export class Message {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  conversationId: string;

  @Field(() => Conversation)
  @ManyToOne(() => Conversation, (c) => c.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Field()
  @Column()
  senderId: string;

  @Field(() => UserProfile, { nullable: true })
  @ManyToOne(() => UserProfile, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'senderId', referencedColumnName: 'userId' })
  sender?: UserProfile;

  @Field(() => MessageType)
  @Column({ type: 'enum', enum: MessageType, default: MessageType.TEXT })
  type: MessageType;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  content?: string;

  @Field(() => [String], { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  mediaUrls?: string[];

  @Field({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  fileInfo?: Record<string, any>;

  @Field({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  tradeData?: Record<string, any>;

  @Field({ nullable: true })
  @Column({ nullable: true })
  replyToId?: string;

  @Field(() => Message, { nullable: true })
  @ManyToOne(() => Message, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'replyToId' })
  replyTo?: Message;

  @Field(() => [String], { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  mentions?: string[];

  @Field(() => MessageStatus)
  @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.SENT })
  status: MessageStatus;

  @Field(() => Int)
  @Column({ default: 0 })
  readByCount: number;

  @Field()
  @Column({ default: false })
  isEdited: boolean;

  @Field()
  @Column({ default: false })
  isPinned: boolean;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  deletedAt?: Date;

  // Virtual fields
  @Field({ nullable: true })
  isOwn?: boolean;
}
