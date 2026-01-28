import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseReview, ReviewStatus } from '../../entities';
import { createPaginatedResponse, IPaginatedResponse } from '../../dto/paginated-response.dto';
import { PaginationDto } from '../../dto/pagination.dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(CourseReview) private reviewRepository: Repository<CourseReview>,
  ) {}

  async create(userId: string, createDto: any): Promise<CourseReview> {
    const existing = await this.reviewRepository.findOne({ where: { userId, courseId: createDto.courseId } });
    if (existing) throw new ConflictException('You have already reviewed this course');
    const review = this.reviewRepository.create({ ...createDto, userId });
    return this.reviewRepository.save(review);
  }

  async findByCourse(courseId: string, paginationDto: PaginationDto): Promise<IPaginatedResponse<CourseReview>> {
    const { page = 1, limit = 10 } = paginationDto;
    const [items, total] = await this.reviewRepository.findAndCount({
      where: { courseId, status: ReviewStatus.APPROVED },
      order: { featured: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return createPaginatedResponse(items, total, page, limit);
  }

  async findOne(id: string): Promise<CourseReview> {
    const review = await this.reviewRepository.findOne({ where: { id } });
    if (!review) throw new NotFoundException(`Review with ID ${id} not found`);
    return review;
  }

  async update(id: string, userId: string, updateDto: any): Promise<CourseReview> {
    const review = await this.findOne(id);
    if (review.userId !== userId) throw new NotFoundException('Review not found');
    Object.assign(review, updateDto);
    return this.reviewRepository.save(review);
  }

  async remove(id: string, userId: string): Promise<void> {
    const review = await this.findOne(id);
    if (review.userId !== userId) throw new NotFoundException('Review not found');
    await this.reviewRepository.remove(review);
  }

  async markHelpful(id: string, helpful: boolean): Promise<CourseReview> {
    const review = await this.findOne(id);
    if (helpful) review.helpful.yes += 1;
    else review.helpful.no += 1;
    return this.reviewRepository.save(review);
  }

  async addInstructorResponse(id: string, comment: string): Promise<CourseReview> {
    const review = await this.findOne(id);
    review.instructorResponse = { comment, respondedAt: new Date() };
    return this.reviewRepository.save(review);
  }

  async moderate(id: string, status: ReviewStatus, note?: string): Promise<CourseReview> {
    const review = await this.findOne(id);
    review.status = status;
    if (note) review.moderationNote = note;
    return this.reviewRepository.save(review);
  }

  async getCourseStats(courseId: string): Promise<{ average: number; count: number; distribution: Record<number, number> }> {
    const reviews = await this.reviewRepository.find({ where: { courseId, status: ReviewStatus.APPROVED } });
    const count = reviews.length;
    if (count === 0) return { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => distribution[r.rating]++);
    return { average: Math.round((sum / count) * 10) / 10, count, distribution };
  }

  async getUserReview(userId: string, courseId: string): Promise<CourseReview | null> {
    return this.reviewRepository.findOne({ where: { userId, courseId } });
  }
}
