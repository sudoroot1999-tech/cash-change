import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lesson } from '../../entities/lesson.entity';
import { LessonService } from './lesson.service';
import { LessonController } from './lesson.controller';
import { LessonResolver } from './lesson.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Lesson])],
  controllers: [LessonController],
  providers: [LessonService, LessonResolver],
  exports: [LessonService],
})
export class LessonModule {}
