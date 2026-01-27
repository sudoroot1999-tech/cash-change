import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ContentType {
  BLOG_POST = 'blog_post',
  ARTICLE = 'article',
  NEWS = 'news',
  VIDEO = 'video',
  PODCAST = 'podcast',
  WEBINAR = 'webinar',
  TUTORIAL = 'tutorial',
  GUIDE = 'guide',
  CASE_STUDY = 'case_study',
}

export enum ContentStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('marketing_content')
@Index(['type', 'status'])
@Index(['slug'], { unique: true })
@Index(['publishedAt'])
export class MarketingContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ContentType,
  })
  type: ContentType;

  @Column({
    type: 'enum',
    enum: ContentStatus,
    default: ContentStatus.DRAFT,
  })
  status: ContentStatus;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'varchar', length: 500, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  featuredImage: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailImage: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  videoUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  audioUrl: string;

  // SEO
  @Column({ type: 'varchar', length: 200, nullable: true })
  metaTitle: string;

  @Column({ type: 'text', nullable: true })
  metaDescription: string;

  @Column({ type: 'jsonb', default: [] })
  metaKeywords: string[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  canonicalUrl: string;

  // Categorization
  @Column({ type: 'jsonb', default: [] })
  categories: string[];

  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  @Column({ type: 'uuid', nullable: true })
  authorId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  authorName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  authorAvatar: string;

  @Column({ type: 'text', nullable: true })
  authorBio: string;

  // Publishing
  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  scheduledFor: Date;

  // Engagement metrics
  @Column({ type: 'integer', default: 0 })
  views: number;

  @Column({ type: 'integer', default: 0 })
  uniqueViews: number;

  @Column({ type: 'integer', default: 0 })
  likes: number;

  @Column({ type: 'integer', default: 0 })
  shares: number;

  @Column({ type: 'integer', default: 0 })
  comments: number;

  @Column({ type: 'integer', default: 0 })
  bookmarks: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  averageTimeSpent: number; // seconds

  // Related content
  @Column({ type: 'jsonb', default: [] })
  relatedContentIds: string[];

  // Featured/Pinned
  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ type: 'integer', default: 0 })
  featuredOrder: number;

  // Community features
  @Column({ type: 'boolean', default: true })
  allowComments: boolean;

  @Column({ type: 'boolean', default: false })
  requiresLogin: boolean;

  // Language and localization
  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string;

  @Column({ type: 'uuid', nullable: true })
  translationOf: string;

  @Column({ type: 'jsonb', nullable: true })
  translations: Record<string, string>; // { es: contentId, fr: contentId }

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
