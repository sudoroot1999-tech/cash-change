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

export enum LikeTargetType {
  POST = 'post',
  COMMENT = 'comment',
  STORY = 'story',
}

registerEnumType(LikeTargetType, { name: 'LikeTargetType' });

@ObjectType()
@Entity('likes')
@Index(['userId', 'targetId', 'targetType'])
@Unique(['userId', 'targetId', 'targetType'])
export class Like {
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
  targetId: string;

  @Field(() => LikeTargetType)
  @Column({ type: 'enum', enum: LikeTargetType })
  targetType: LikeTargetType;

  @Field()
  @CreateDateColumn()
  createdAt: Date;
}
