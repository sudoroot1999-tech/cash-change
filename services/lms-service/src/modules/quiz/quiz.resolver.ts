import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { Quiz, QuizAttempt } from '../../database/entities';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Resolver(() => Quiz)
export class QuizResolver {
  constructor(private readonly quizService: QuizService) {}

  @Mutation(() => Quiz)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async createQuiz(@Args('input') createQuizDto: CreateQuizDto): Promise<Quiz> {
    return this.quizService.create(createQuizDto);
  }

  @Query(() => Quiz, { name: 'quiz' })
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<Quiz> {
    return this.quizService.findOne(id);
  }

  @Query(() => Quiz, { name: 'quizByLesson', nullable: true })
  async findByLesson(@Args('lessonId', { type: () => ID }) lessonId: string): Promise<Quiz | null> {
    return this.quizService.findByLesson(lessonId);
  }

  @Query(() => [Quiz], { name: 'quizzesByCourse' })
  async findByCourse(@Args('courseId', { type: () => ID }) courseId: string): Promise<Quiz[]> {
    return this.quizService.findByCourse(courseId);
  }

  @Mutation(() => Quiz)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async updateQuiz(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') updateQuizDto: UpdateQuizDto,
  ): Promise<Quiz> {
    return this.quizService.update(id, updateQuizDto);
  }

  @Mutation(() => QuizAttempt)
  @UseGuards(JwtAuthGuard)
  async submitQuiz(
    @Args('quizId', { type: () => ID }) quizId: string,
    @Args('input') submitQuizDto: SubmitQuizDto,
    @CurrentUser('userId') userId: string,
  ): Promise<QuizAttempt> {
    return this.quizService.submitQuiz(userId, quizId, submitQuizDto);
  }

  @Query(() => [QuizAttempt], { name: 'quizAttempts' })
  @UseGuards(JwtAuthGuard)
  async getAttempts(
    @Args('quizId', { type: () => ID }) quizId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<QuizAttempt[]> {
    return this.quizService.getAttempts(userId, quizId);
  }

  @Query(() => QuizAttempt, { name: 'bestQuizAttempt', nullable: true })
  @UseGuards(JwtAuthGuard)
  async getBestAttempt(
    @Args('quizId', { type: () => ID }) quizId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<QuizAttempt | null> {
    return this.quizService.getBestAttempt(userId, quizId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async deleteQuiz(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    await this.quizService.remove(id);
    return true;
  }
}
