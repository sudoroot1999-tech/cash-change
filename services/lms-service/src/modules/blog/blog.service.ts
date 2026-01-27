import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { BlogPost, BlogPostStatus } from '../../database/entities';
import { createPaginatedResponse, IPaginatedResponse } from '../../common/dto/paginated-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(BlogPost) private blogRepository: Repository<BlogPost>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private generateSlug(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').concat('-', Date.now().toString(36));
  }

  async create(createDto: any): Promise<BlogPost> {
    const slug = this.generateSlug(createDto.title);
    const post = this.blogRepository.create({ ...createDto, slug });
    return this.blogRepository.save(post);
  }

  async findAll(paginationDto: PaginationDto, category?: string): Promise<IPaginatedResponse<BlogPost>> {
    const { page = 1, limit = 10, search } = paginationDto;
    const queryBuilder = this.blogRepository.createQueryBuilder('post').where('post.status = :status', { status: BlogPostStatus.PUBLISHED });
    if (category) queryBuilder.andWhere('post.category = :category', { category });
    if (search) queryBuilder.andWhere('(post.title ILIKE :search OR post.content ILIKE :search)', { search: `%${search}%` });
    queryBuilder.orderBy('post.isPinned', 'DESC').addOrderBy('post.publishedAt', 'DESC');
    const total = await queryBuilder.getCount();
    const items = await queryBuilder.skip((page - 1) * limit).take(limit).getMany();
    return createPaginatedResponse(items, total, page, limit);
  }

  async findOne(id: string): Promise<BlogPost> {
    const post = await this.blogRepository.findOne({ where: { id } });
    if (!post) throw new NotFoundException(`Blog post with ID ${id} not found`);
    post.views += 1;
    await this.blogRepository.save(post);
    return post;
  }

  async findBySlug(slug: string): Promise<BlogPost> {
    const post = await this.blogRepository.findOne({ where: { slug } });
    if (!post) throw new NotFoundException(`Blog post not found`);
    post.views += 1;
    await this.blogRepository.save(post);
    return post;
  }

  async update(id: string, updateDto: any): Promise<BlogPost> {
    const post = await this.findOne(id);
    Object.assign(post, updateDto);
    return this.blogRepository.save(post);
  }

  async remove(id: string): Promise<void> {
    const post = await this.findOne(id);
    await this.blogRepository.remove(post);
  }

  async publish(id: string): Promise<BlogPost> {
    const post = await this.findOne(id);
    post.status = BlogPostStatus.PUBLISHED;
    post.publishedAt = new Date();
    return this.blogRepository.save(post);
  }

  async like(id: string): Promise<BlogPost> {
    await this.blogRepository.increment({ id }, 'likes', 1);
    return this.findOne(id);
  }

  async getFeatured(): Promise<BlogPost[]> {
    return this.blogRepository.find({ where: { status: BlogPostStatus.PUBLISHED, featured: true }, order: { publishedAt: 'DESC' }, take: 5 });
  }

  async getCategories(): Promise<string[]> {
    const result = await this.blogRepository.createQueryBuilder('post').select('DISTINCT post.category', 'category').where('post.status = :status', { status: BlogPostStatus.PUBLISHED }).getRawMany();
    return result.map(r => r.category);
  }
}
