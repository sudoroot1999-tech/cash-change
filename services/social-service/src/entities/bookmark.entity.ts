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
import { Post } from './post.entity';

@ObjectType()
@Entity('bookmarks')
@Index(['userId'])
@Unique(['userId', 'postId'])
export class Bookmark {
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
  postId: string;

  @Field(() => Post, { nullable: true })
  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post?: Post;

  @Field({ nullable: true })
  @Column({ nullable: true })
  collectionName?: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;
}
