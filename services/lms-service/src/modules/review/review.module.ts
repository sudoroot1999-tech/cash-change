import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseReview } from '../../entities';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { ReviewResolver } from './review.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([CourseReview])],
  controllers: [ReviewController],
  providers: [ReviewService, ReviewResolver],
  exports: [ReviewService],
})
export class ReviewModule {}
