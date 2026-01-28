import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeBaseArticle, ArticleStatus, ArticleType } from '../../entities';
import { createPaginatedResponse, IPaginatedResponse } from '../../dto/paginated-response.dto';
import { PaginationDto } from '../../dto/pagination.dto';

@Injectable()
export class KnowledgeBaseService {
  constructor(
    @InjectRepository(KnowledgeBaseArticle) private articleRepository: Repository<KnowledgeBaseArticle>,
  ) {}

  private generateSlug(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').concat('-', Date.now().toString(36));
  }

  async create(createDto: any): Promise<KnowledgeBaseArticle> {
    const slug = this.generateSlug(createDto.title);
    const article = this.articleRepository.create({ ...createDto, slug });
    return this.articleRepository.save(article);
  }

  async findAll(paginationDto: PaginationDto, category?: string, type?: ArticleType): Promise<IPaginatedResponse<KnowledgeBaseArticle>> {
    const { page = 1, limit = 10, search } = paginationDto;
    const queryBuilder = this.articleRepository.createQueryBuilder('article').where('article.status = :status', { status: ArticleStatus.PUBLISHED });
    if (category) queryBuilder.andWhere('article.category = :category', { category });
    if (type) queryBuilder.andWhere('article.type = :type', { type });
    if (search) queryBuilder.andWhere('(article.title ILIKE :search OR article.content ILIKE :search)', { search: `%${search}%` });
    queryBuilder.orderBy('article.featured', 'DESC').addOrderBy('article.order', 'ASC');
    const total = await queryBuilder.getCount();
    const items = await queryBuilder.skip((page - 1) * limit).take(limit).getMany();
    return createPaginatedResponse(items, total, page, limit);
  }

  async findOne(id: string): Promise<KnowledgeBaseArticle> {
    const article = await this.articleRepository.findOne({ where: { id } });
    if (!article) throw new NotFoundException(`Article with ID ${id} not found`);
    article.views += 1;
    await this.articleRepository.save(article);
    return article;
  }

  async findBySlug(slug: string): Promise<KnowledgeBaseArticle> {
    const article = await this.articleRepository.findOne({ where: { slug } });
    if (!article) throw new NotFoundException(`Article not found`);
    article.views += 1;
    await this.articleRepository.save(article);
    return article;
  }

  async update(id: string, updateDto: any): Promise<KnowledgeBaseArticle> {
    const article = await this.findOne(id);
    Object.assign(article, updateDto);
    return this.articleRepository.save(article);
  }

  async remove(id: string): Promise<void> {
    const article = await this.findOne(id);
    await this.articleRepository.remove(article);
  }

  async publish(id: string): Promise<KnowledgeBaseArticle> {
    const article = await this.findOne(id);
    article.status = ArticleStatus.PUBLISHED;
    article.publishedAt = new Date();
    return this.articleRepository.save(article);
  }

  async markHelpful(id: string, helpful: boolean): Promise<KnowledgeBaseArticle> {
    const article = await this.findOne(id);
    if (helpful) article.helpful.yes += 1;
    else article.helpful.no += 1;
    return this.articleRepository.save(article);
  }

  async getCategories(): Promise<string[]> {
    const result = await this.articleRepository.createQueryBuilder('article').select('DISTINCT article.category', 'category').where('article.status = :status', { status: ArticleStatus.PUBLISHED }).getRawMany();
    return result.map(r => r.category);
  }

  async getFeatured(): Promise<KnowledgeBaseArticle[]> {
    return this.articleRepository.find({ where: { status: ArticleStatus.PUBLISHED, featured: true }, order: { order: 'ASC' }, take: 10 });
  }
}
