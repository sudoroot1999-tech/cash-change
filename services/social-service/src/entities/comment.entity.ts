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
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { UserProfile } from './user-profile.entity';
import { Post } from './post.entity';

@ObjectType()
@Entity('comments')
@Index(['postId'])
@Index(['authorId'])
@Index(['parentId'])
export class Comment {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  postId: string;

  @Field(() => Post)
  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @Field()
  @Column()
  authorId: string;

  @Field(() => UserProfile, { nullable: true })
  @ManyToOne(() => UserProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId', referencedColumnName: 'userId' })
  author?: UserProfile;

  @Field({ nullable: true })
  @Column({ nullable: true })
  parentId?: string;

  @Field(() => Comment, { nullable: true })
  @ManyToOne(() => Comment, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent?: Comment;

  @Field()
  @Column({ type: 'text' })
  content: string;

  @Field(() => [String], { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  mediaUrls?: string[];

  @Field(() => [String], { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  mentions?: string[];

  @Field(() => Int)
  @Column({ default: 0 })
  likesCount: number;

  @Field(() => Int)
  @Column({ default: 0 })
  repliesCount: number;

  @Field()
  @Column({ default: false })
  isEdited: boolean;

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
  isLiked?: boolean;

  @Field(() => [Comment], { nullable: true })
  replies?: Comment[];
}
