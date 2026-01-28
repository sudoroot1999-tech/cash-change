import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LearningPath, UserLearningPath, UserLearningPathStatus } from '../../entities';
import { CreateLearningPathDto } from './dto/create-learning-path.dto';
import { createPaginatedResponse, IPaginatedResponse } from '../../dto/paginated-response.dto';
import { PaginationDto } from '../../dto/pagination.dto';

@Injectable()
export class LearningPathService {
  constructor(
    @InjectRepository(LearningPath)
    private learningPathRepository: Repository<LearningPath>,
    @InjectRepository(UserLearningPath)
    private userLearningPathRepository: Repository<UserLearningPath>
  ) {}

  private generateSlug(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').concat('-', Date.now().toString(36));
  }

  async create(createDto: CreateLearningPathDto): Promise<LearningPath> {
    const slug = this.generateSlug(createDto.title);
    const learningPath = this.learningPathRepository.create({ ...createDto, slug });
    return this.learningPathRepository.save(learningPath);
  }

  async findAll(paginationDto: PaginationDto): Promise<IPaginatedResponse<LearningPath>> {
    const { page = 1, limit = 10, search } = paginationDto;
    const queryBuilder = this.learningPathRepository.createQueryBuilder('lp').where('lp.isPublished = :isPublished', { isPublished: true });
    if (search) queryBuilder.andWhere('lp.title ILIKE :search', { search: `%${search}%` });
    queryBuilder.orderBy('lp.createdAt', 'DESC');
    const total = await queryBuilder.getCount();
    const items = await queryBuilder.skip((page - 1) * limit).take(limit).getMany();
    return createPaginatedResponse(items, total, page, limit);
  }

  async findOne(id: string): Promise<LearningPath> {
    const learningPath = await this.learningPathRepository.findOne({ where: { id } });
    if (!learningPath) throw new NotFoundException(`Learning path with ID ${id} not found`);
    return learningPath;
  }

  async findBySlug(slug: string): Promise<LearningPath> {
    const learningPath = await this.learningPathRepository.findOne({ where: { slug } });
    if (!learningPath) throw new NotFoundException(`Learning path not found`);
    return learningPath;
  }

  async update(id: string, updateDto: Partial<CreateLearningPathDto>): Promise<LearningPath> {
    const learningPath = await this.findOne(id);
    Object.assign(learningPath, updateDto);
    return this.learningPathRepository.save(learningPath);
  }

  async remove(id: string): Promise<void> {
    const learningPath = await this.findOne(id);
    await this.learningPathRepository.remove(learningPath);
  }

  async enroll(userId: string, learningPathId: string): Promise<UserLearningPath> {
    const existing = await this.userLearningPathRepository.findOne({ where: { userId, learningPathId } });
    if (existing) throw new ConflictException('Already enrolled');
    const learningPath = await this.findOne(learningPathId);
    const enrollment = this.userLearningPathRepository.create({
      userId, learningPathId,
      progress: { completedCourses: [], totalCourses: learningPath.courses.length, percentage: 0 },
    });
    await this.learningPathRepository.increment({ id: learningPathId }, 'enrollmentCount', 1);
    return this.userLearningPathRepository.save(enrollment);
  }

  async getUserLearningPaths(userId: string): Promise<UserLearningPath[]> {
    return this.userLearningPathRepository.find({ where: { userId }, relations: ['learningPath'] });
  }

  async getFeatured(): Promise<LearningPath[]> {
    return this.learningPathRepository.find({ where: { isPublished: true, featured: true }, take: 10 });
  }
}
