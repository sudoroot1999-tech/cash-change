import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quiz, QuizAttempt } from '../../entities';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { QuizResolver } from './quiz.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Quiz, QuizAttempt])],
  controllers: [QuizController],
  providers: [QuizService, QuizResolver],
  exports: [QuizService],
})
export class QuizModule {}
