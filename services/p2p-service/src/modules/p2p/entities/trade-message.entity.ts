import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
}

@Entity('trade_messages')
@Index(['tradeId', 'createdAt'])
@Index(['senderId'])
export class TradeMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'trade_id' })
  @Index()
  tradeId: string;

  @Column({ name: 'sender_id' })
  senderId: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({
    type: 'text',
  })
  content: string;

  @Column({
    name: 'file_url',
    nullable: true,
  })
  fileUrl: string;

  @Column({
    name: 'is_read',
    type: 'boolean',
    default: false,
  })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
