import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../../entities/course.entity';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { CourseResolver } from './course.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Course])],
  controllers: [CourseController],
  providers: [CourseService, CourseResolver],
  exports: [CourseService],
})
export class CourseModule {}
