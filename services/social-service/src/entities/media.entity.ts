import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import { UserProfile } from './user-profile.entity';

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
}

registerEnumType(MediaType, { name: 'MediaType' });

@ObjectType()
@Entity('media')
@Index(['uploaderId'])
@Index(['type'])
export class Media {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  uploaderId: string;

  @Field(() => UserProfile, { nullable: true })
  @ManyToOne(() => UserProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uploaderId', referencedColumnName: 'userId' })
  uploader?: UserProfile;

  @Field(() => MediaType)
  @Column({ type: 'enum', enum: MediaType })
  type: MediaType;

  @Field()
  @Column()
  filename: string;

  @Field()
  @Column()
  originalFilename: string;

  @Field()
  @Column()
  mimeType: string;

  @Field(() => Int)
  @Column()
  size: number;

  @Field()
  @Column()
  url: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  thumbnailUrl?: string;

  @Field(() => Int, { nullable: true })
  @Column({ nullable: true })
  width?: number;

  @Field(() => Int, { nullable: true })
  @Column({ nullable: true })
  height?: number;

  @Field(() => Int, { nullable: true })
  @Column({ nullable: true })
  duration?: number;

  @Field({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Field()
  @CreateDateColumn()
  createdAt: Date;
}
