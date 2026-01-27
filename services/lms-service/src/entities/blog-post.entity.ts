import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';

export enum BlogPostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

registerEnumType(BlogPostStatus, { name: 'BlogPostStatus' });

@ObjectType()
export class BlogAuthor {
  @Field()
  userId: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field({ nullable: true })
  bio?: string;
}

@ObjectType()
export class BlogSeo {
  @Field({ nullable: true })
  metaTitle?: string;

  @Field({ nullable: true })
  metaDescription?: string;

  @Field(() => [String], { nullable: true })
  keywords?: string[];

  @Field({ nullable: true })
  canonicalUrl?: string;
}

@ObjectType()
export class SocialShares {
  @Field(() => Int)
  twitter: number;

  @Field(() => Int)
  facebook: number;

  @Field(() => Int)
  linkedin: number;
}

@ObjectType()
@Entity('blog_posts')
@Index(['category'])
@Index(['status'])
@Index(['publishedAt'])
@Index(['views'])
export class BlogPost {
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
  @Column({ length: 300 })
  excerpt: string;

  @Field()
  @Column('text')
  content: string;

  @Field(() => BlogAuthor)
  @Column('jsonb')
  author: BlogAuthor;

  @Field({ nullable: true })
  @Column({ nullable: true })
  featuredImage?: string;

  @Field()
  @Column()
  category: string;

  @Field(() => [String])
  @Column('simple-array', { default: '' })
  tags: string[];

  @Field(() => BlogPostStatus)
  @Column({ type: 'enum', enum: BlogPostStatus, default: BlogPostStatus.DRAFT })
  status: BlogPostStatus;

  @Field({ nullable: true })
  @Column({ nullable: true })
  publishedAt?: Date;

  @Field(() => Int)
  @Column({ default: 5 })
  readTime: number;

  @Field(() => Int)
  @Column({ default: 0 })
  views: number;

  @Field(() => Int)
  @Column({ default: 0 })
  likes: number;

  @Field(() => Int)
  @Column({ default: 0 })
  comments: number;

  @Field(() => [String])
  @Column('simple-array', { default: '' })
  relatedPosts: string[];

  @Field(() => BlogSeo, { nullable: true })
  @Column('jsonb', { nullable: true })
  seo?: BlogSeo;

  @Field(() => SocialShares)
  @Column('jsonb', { default: { twitter: 0, facebook: 0, linkedin: 0 } })
  socialShares: SocialShares;

  @Field()
  @Column({ default: false })
  featured: boolean;

  @Field()
  @Column({ default: false })
  isPinned: boolean;

  @Field()
  @Column({ default: true })
  allowComments: boolean;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
