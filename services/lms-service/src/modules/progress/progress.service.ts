import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProgress, ProgressStatus } from '../../entities/user-progress.entity';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { createPaginatedResponse, IPaginatedResponse } from '../../dto/paginated-response.dto';
import { PaginationDto } from '../../dto/pagination.dto';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(UserProgress)
    private progressRepository: Repository<UserProgress>
  ) {}

  async enroll(userId: string, enrollDto: EnrollCourseDto): Promise<UserProgress> {
    const existing = await this.progressRepository.findOne({
      where: { userId, courseId: enrollDto.courseId },
    });

    if (existing) {
      throw new ConflictException('Already enrolled in this course');
    }

    const progress = this.progressRepository.create({
      userId,
      courseId: enrollDto.courseId,
      status: ProgressStatus.ENROLLED,
      progress: {
        completedLessons: [],
        totalLessons: 0,
        completedModules: [],
        percentage: 0,
      },
      quizScores: [],
      notes: [],
      bookmarks: [],
      learningStreak: { current: 0, longest: 0, lastActivityDate: new Date() },
    });

    return this.progressRepository.save(progress);
  }

  async getUserProgress(userId: string, courseId: string): Promise<UserProgress> {
    const progress = await this.progressRepository.findOne({
      where: { userId, courseId },
      relations: ['course'],
    });

    if (!progress) {
      throw new NotFoundException('Progress not found');
    }

    return progress;
  }

  async getUserCourses(
    userId: string,
    paginationDto: PaginationDto,
    status?: ProgressStatus,
  ): Promise<IPaginatedResponse<UserProgress>> {
    const { page = 1, limit = 10 } = paginationDto;

    const queryBuilder = this.progressRepository
      .createQueryBuilder('progress')
      .leftJoinAndSelect('progress.course', 'course')
      .where('progress.userId = :userId', { userId });

    if (status) {
      queryBuilder.andWhere('progress.status = :status', { status });
    }

    queryBuilder.orderBy('progress.lastAccessedAt', 'DESC');

    const total = await queryBuilder.getCount();
    const items = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return createPaginatedResponse(items, total, page, limit);
  }

  async completeLesson(
    userId: string,
    courseId: string,
    lessonId: string,
    timeSpent: number,
  ): Promise<UserProgress> {
    const progress = await this.getUserProgress(userId, courseId);

    if (!progress.progress.completedLessons.includes(lessonId)) {
      progress.progress.completedLessons.push(lessonId);
    }

    progress.timeSpent += timeSpent;
    progress.lastAccessedAt = new Date();

    if (progress.status === ProgressStatus.ENROLLED) {
      progress.status = ProgressStatus.IN_PROGRESS;
      progress.startedAt = new Date();
    }

    // Update percentage
    if (progress.progress.totalLessons > 0) {
      progress.progress.percentage =
        (progress.progress.completedLessons.length / progress.progress.totalLessons) * 100;
    }

    // Update streak
    this.updateStreak(progress);

    return this.progressRepository.save(progress);
  }

  async completeModule(userId: string, courseId: string, moduleId: string): Promise<UserProgress> {
    const progress = await this.getUserProgress(userId, courseId);

    if (!progress.progress.completedModules.includes(moduleId)) {
      progress.progress.completedModules.push(moduleId);
    }

    progress.lastAccessedAt = new Date();
    return this.progressRepository.save(progress);
  }

  async completeCourse(userId: string, courseId: string): Promise<UserProgress> {
    const progress = await this.getUserProgress(userId, courseId);

    progress.status = ProgressStatus.COMPLETED;
    progress.completedAt = new Date();
    progress.progress.percentage = 100;

    return this.progressRepository.save(progress);
  }

  async addNote(
    userId: string,
    courseId: string,
    lessonId: string,
    note: string,
  ): Promise<UserProgress> {
    const progress = await this.getUserProgress(userId, courseId);

    progress.notes.push({
      lessonId,
      note,
      timestamp: new Date(),
    });

    return this.progressRepository.save(progress);
  }

  async addBookmark(
    userId: string,
    courseId: string,
    lessonId: string,
    timestamp: number,
    note?: string,
  ): Promise<UserProgress> {
    const progress = await this.getUserProgress(userId, courseId);

    progress.bookmarks.push({
      lessonId,
      timestamp,
      note,
      createdAt: new Date(),
    });

    return this.progressRepository.save(progress);
  }

  async removeBookmark(userId: string, courseId: string, lessonId: string): Promise<UserProgress> {
    const progress = await this.getUserProgress(userId, courseId);

    progress.bookmarks = progress.bookmarks.filter((b) => b.lessonId !== lessonId);

    return this.progressRepository.save(progress);
  }

  async updateCurrentLesson(
    userId: string,
    courseId: string,
    lessonId: string,
  ): Promise<UserProgress> {
    const progress = await this.getUserProgress(userId, courseId);

    progress.progress.currentLesson = lessonId;
    progress.lastAccessedAt = new Date();

    return this.progressRepository.save(progress);
  }

  async dropCourse(userId: string, courseId: string): Promise<UserProgress> {
    const progress = await this.getUserProgress(userId, courseId);

    progress.status = ProgressStatus.DROPPED;

    return this.progressRepository.save(progress);
  }

  async getLeaderboard(limit: number = 10): Promise<UserProgress[]> {
    return this.progressRepository
      .createQueryBuilder('progress')
      .select('progress.userId')
      .addSelect('SUM(progress.xpEarned)', 'totalXp')
      .groupBy('progress.userId')
      .orderBy('totalXp', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  private updateStreak(progress: UserProgress): void {
    const today = new Date();
    const lastActivity = new Date(progress.learningStreak.lastActivityDate);
    const diffDays = Math.floor(
      (today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 1) {
      progress.learningStreak.current += 1;
      if (progress.learningStreak.current > progress.learningStreak.longest) {
        progress.learningStreak.longest = progress.learningStreak.current;
      }
    } else if (diffDays > 1) {
      progress.learningStreak.current = 1;
    }

    progress.learningStreak.lastActivityDate = today;
  }
}
