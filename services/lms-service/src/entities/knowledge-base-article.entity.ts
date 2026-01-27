import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';

export enum ArticleType {
  HOW_TO = 'how-to',
  GUIDE = 'guide',
  FAQ = 'faq',
  TROUBLESHOOTING = 'troubleshooting',
  TUTORIAL = 'tutorial',
}

export enum ArticleDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum ArticleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

registerEnumType(ArticleType, { name: 'ArticleType' });
registerEnumType(ArticleDifficulty, { name: 'ArticleDifficulty' });
registerEnumType(ArticleStatus, { name: 'ArticleStatus' });

@ObjectType()
export class ArticleAuthor {
  @Field()
  userId: string;

  @Field()
  name: string;
}

@ObjectType()
export class ArticleHelpful {
  @Field(() => Int)
  yes: number;

  @Field(() => Int)
  no: number;
}

@ObjectType()
export class ArticleAttachment {
  @Field()
  title: string;

  @Field()
  url: string;

  @Field()
  type: string;
}

@ObjectType()
@Entity('knowledge_base_articles')
@Index(['category', 'status'])
@Index(['views'])
export class KnowledgeBaseArticle {
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
  @Column('text')
  content: string;

  @Field()
  @Column()
  category: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  subcategory?: string;

  @Field(() => ArticleType)
  @Column({ type: 'enum', enum: ArticleType })
  type: ArticleType;

  @Field(() => ArticleAuthor)
  @Column('jsonb')
  author: ArticleAuthor;

  @Field(() => [String])
  @Column('simple-array', { default: '' })
  tags: string[];

  @Field(() => [String])
  @Column('simple-array', { default: '' })
  relatedArticles: string[];

  @Field(() => [String])
  @Column('simple-array', { default: '' })
  relatedCourses: string[];

  @Field(() => ArticleDifficulty)
  @Column({ type: 'enum', enum: ArticleDifficulty, default: ArticleDifficulty.BEGINNER })
  difficulty: ArticleDifficulty;

  @Field(() => Int)
  @Column({ default: 5 })
  estimatedReadTime: number;

  @Field(() => Int)
  @Column({ default: 0 })
  views: number;

  @Field(() => ArticleHelpful)
  @Column('jsonb', { default: { yes: 0, no: 0 } })
  helpful: ArticleHelpful;

  @Field(() => ArticleStatus)
  @Column({ type: 'enum', enum: ArticleStatus, default: ArticleStatus.DRAFT })
  status: ArticleStatus;

  @Field({ nullable: true })
  @Column({ nullable: true })
  publishedAt?: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  lastReviewedAt?: Date;

  @Field(() => Int)
  @Column({ default: 1 })
  version: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  videoUrl?: string;

  @Field(() => [ArticleAttachment])
  @Column('jsonb', { default: [] })
  attachments: ArticleAttachment[];

  @Field(() => [String])
  @Column('simple-array', { default: '' })
  searchKeywords: string[];

  @Field()
  @Column({ default: false })
  featured: boolean;

  @Field(() => Int)
  @Column({ default: 0 })
  order: number;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
