import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Lesson } from '../../database/entities/lesson.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Injectable()
export class LessonService {
  constructor(
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async create(createLessonDto: CreateLessonDto): Promise<Lesson> {
    const lesson = this.lessonRepository.create({
      ...createLessonDto,
      content: createLessonDto.content || {},
      resources: createLessonDto.resources || [],
      completionCriteria: createLessonDto.completionCriteria || { type: 'view' },
    });
    const savedLesson = await this.lessonRepository.save(lesson);
    await this.invalidateCache(createLessonDto.moduleId);
    return savedLesson;
  }

  async findByModule(moduleId: string): Promise<Lesson[]> {
    const cacheKey = `lessons:module:${moduleId}`;
    const cached = await this.cacheManager.get<Lesson[]>(cacheKey);
    if (cached) return cached;

    const lessons = await this.lessonRepository.find({
      where: { moduleId },
      order: { order: 'ASC' },
    });

    await this.cacheManager.set(cacheKey, lessons, 300000);
    return lessons;
  }

  async findByCourse(courseId: string): Promise<Lesson[]> {
    return this.lessonRepository.find({
      where: { courseId },
      order: { order: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['quiz'],
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    return lesson;
  }

  async update(id: string, updateLessonDto: UpdateLessonDto): Promise<Lesson> {
    const lesson = await this.findOne(id);
    Object.assign(lesson, updateLessonDto);
    const updatedLesson = await this.lessonRepository.save(lesson);
    await this.invalidateCache(lesson.moduleId);
    return updatedLesson;
  }

  async remove(id: string): Promise<void> {
    const lesson = await this.findOne(id);
    const moduleId = lesson.moduleId;
    await this.lessonRepository.remove(lesson);
    await this.invalidateCache(moduleId);
  }

  async reorder(moduleId: string, lessonIds: string[]): Promise<Lesson[]> {
    const lessons = await this.findByModule(moduleId);

    for (let i = 0; i < lessonIds.length; i++) {
      const lesson = lessons.find((l) => l.id === lessonIds[i]);
      if (lesson) {
        lesson.order = i;
        await this.lessonRepository.save(lesson);
      }
    }

    await this.invalidateCache(moduleId);
    return this.findByModule(moduleId);
  }

  async getPreviewLessons(courseId: string): Promise<Lesson[]> {
    return this.lessonRepository.find({
      where: { courseId, isPreview: true },
      order: { order: 'ASC' },
    });
  }

  private async invalidateCache(moduleId: string): Promise<void> {
    await this.cacheManager.del(`lessons:module:${moduleId}`);
  }
}
