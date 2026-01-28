import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Course } from '../../entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseFilterDto } from './dto/course-filter.dto';
import { createPaginatedResponse, IPaginatedResponse } from '../../dto/paginated-response.dto';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .concat('-', Date.now().toString(36));
  }

  async create(createCourseDto: CreateCourseDto): Promise<Course> {
    const slug = this.generateSlug(createCourseDto.title);

    const existingCourse = await this.courseRepository.findOne({ where: { slug } });
    if (existingCourse) {
      throw new ConflictException('Course with similar title already exists');
    }

    const course = this.courseRepository.create({
      ...createCourseDto,
      slug,
      rating: { average: 0, count: 0 },
      certificate: createCourseDto.certificate || { enabled: true, passingScore: 70 },
    });

    const savedCourse = await this.courseRepository.save(course);
    await this.invalidateCache();
    return savedCourse;
  }

  async findAll(filterDto: CourseFilterDto): Promise<IPaginatedResponse<Course>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC', search } = filterDto;

    const cacheKey = `courses:${JSON.stringify(filterDto)}`;
    const cached = await this.cacheManager.get<IPaginatedResponse<Course>>(cacheKey);
    if (cached) return cached;

    const queryBuilder = this.courseRepository.createQueryBuilder('course');

    // Apply filters
    if (filterDto.category) {
      queryBuilder.andWhere('course.category = :category', { category: filterDto.category });
    }
    if (filterDto.level) {
      queryBuilder.andWhere('course.level = :level', { level: filterDto.level });
    }
    if (filterDto.subcategory) {
      queryBuilder.andWhere('course.subcategory = :subcategory', { subcategory: filterDto.subcategory });
    }
    if (filterDto.language) {
      queryBuilder.andWhere('course.language = :language', { language: filterDto.language });
    }
    if (filterDto.isFree !== undefined) {
      queryBuilder.andWhere('course.isFree = :isFree', { isFree: filterDto.isFree });
    }
    if (filterDto.isPublished !== undefined) {
      queryBuilder.andWhere('course.isPublished = :isPublished', { isPublished: filterDto.isPublished });
    }
    if (filterDto.instructorId) {
      queryBuilder.andWhere("course.instructor->>'userId' = :instructorId", { instructorId: filterDto.instructorId });
    }
    if (filterDto.tag) {
      queryBuilder.andWhere(':tag = ANY(course.tags)', { tag: filterDto.tag });
    }
    if (search) {
      queryBuilder.andWhere(
        '(course.title ILIKE :search OR course.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply sorting
    const validSortFields = ['createdAt', 'title', 'price', 'enrollmentCount', 'rating'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`course.${sortField}`, sortOrder as 'ASC' | 'DESC');

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip((page - 1) * limit).take(limit);

    const courses = await queryBuilder.getMany();
    const result = createPaginatedResponse(courses, total, page, limit);

    await this.cacheManager.set(cacheKey, result, 300000); // 5 minutes
    return result;
  }

  async findOne(id: string): Promise<Course> {
    const cacheKey = `course:${id}`;
    const cached = await this.cacheManager.get<Course>(cacheKey);
    if (cached) return cached;

    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['modules', 'modules.lessons'],
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    await this.cacheManager.set(cacheKey, course, 300000);
    return course;
  }

  async findBySlug(slug: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { slug },
      relations: ['modules', 'modules.lessons'],
    });

    if (!course) {
      throw new NotFoundException(`Course with slug ${slug} not found`);
    }

    return course;
  }

  async update(id: string, updateCourseDto: UpdateCourseDto): Promise<Course> {
    const course = await this.findOne(id);

    Object.assign(course, updateCourseDto);
    const updatedCourse = await this.courseRepository.save(course);

    await this.invalidateCache(id);
    return updatedCourse;
  }

  async remove(id: string): Promise<void> {
    const course = await this.findOne(id);
    await this.courseRepository.remove(course);
    await this.invalidateCache(id);
  }

  async publish(id: string): Promise<Course> {
    const course = await this.findOne(id);
    course.isPublished = true;
    course.publishedAt = new Date();

    const updatedCourse = await this.courseRepository.save(course);
    await this.invalidateCache(id);
    return updatedCourse;
  }

  async unpublish(id: string): Promise<Course> {
    const course = await this.findOne(id);
    course.isPublished = false;

    const updatedCourse = await this.courseRepository.save(course);
    await this.invalidateCache(id);
    return updatedCourse;
  }

  async incrementEnrollment(id: string): Promise<void> {
    await this.courseRepository.increment({ id }, 'enrollmentCount', 1);
    await this.invalidateCache(id);
  }

  async updateRating(id: string, newRating: number): Promise<void> {
    const course = await this.findOne(id);
    const { average, count } = course.rating;
    const newAverage = (average * count + newRating) / (count + 1);

    course.rating = {
      average: Math.round(newAverage * 10) / 10,
      count: count + 1,
    };

    await this.courseRepository.save(course);
    await this.invalidateCache(id);
  }

  async getPopularCourses(limit: number = 10): Promise<Course[]> {
    return this.courseRepository.find({
      where: { isPublished: true },
      order: { enrollmentCount: 'DESC' },
      take: limit,
    });
  }

  async getTopRatedCourses(limit: number = 10): Promise<Course[]> {
    return this.courseRepository
      .createQueryBuilder('course')
      .where('course.isPublished = :isPublished', { isPublished: true })
      .orderBy("course.rating->>'average'", 'DESC')
      .take(limit)
      .getMany();
  }

  private async invalidateCache(id?: string): Promise<void> {
    if (id) {
      await this.cacheManager.del(`course:${id}`);
    }
    // Invalidate list caches - in production, use pattern-based deletion
    const keys = await this.cacheManager.store.keys?.('courses:*');
    if (keys) {
      await Promise.all(keys.map((key: string) => this.cacheManager.del(key)));
    }
  }
}
