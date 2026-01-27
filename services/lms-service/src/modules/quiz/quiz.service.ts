import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Quiz, QuizAttempt } from '../../database/entities';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quiz)
    private quizRepository: Repository<Quiz>,
    @InjectRepository(QuizAttempt)
    private attemptRepository: Repository<QuizAttempt>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async create(createQuizDto: CreateQuizDto): Promise<Quiz> {
    const quiz = this.quizRepository.create(createQuizDto);
    return this.quizRepository.save(quiz);
  }

  async findOne(id: string): Promise<Quiz> {
    const quiz = await this.quizRepository.findOne({ where: { id } });
    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }
    return quiz;
  }

  async findByLesson(lessonId: string): Promise<Quiz | null> {
    return this.quizRepository.findOne({ where: { lessonId } });
  }

  async findByCourse(courseId: string): Promise<Quiz[]> {
    return this.quizRepository.find({ where: { courseId } });
  }

  async update(id: string, updateQuizDto: UpdateQuizDto): Promise<Quiz> {
    const quiz = await this.findOne(id);
    Object.assign(quiz, updateQuizDto);
    return this.quizRepository.save(quiz);
  }

  async remove(id: string): Promise<void> {
    const quiz = await this.findOne(id);
    await this.quizRepository.remove(quiz);
  }

  async submitQuiz(userId: string, quizId: string, submitDto: SubmitQuizDto): Promise<QuizAttempt> {
    const quiz = await this.findOne(quizId);

    // Check attempt limit
    const attemptCount = await this.attemptRepository.count({
      where: { userId, quizId },
    });

    if (attemptCount >= quiz.attemptsAllowed) {
      throw new BadRequestException('Maximum attempts reached for this quiz');
    }

    // Calculate score
    let score = 0;
    let maxScore = 0;
    const answers = submitDto.answers.map((answer) => {
      const question = quiz.questions.find((q) => q.id === answer.questionId);
      if (!question) {
        return { ...answer, isCorrect: false, pointsEarned: 0 };
      }

      maxScore += question.points;
      const isCorrect = this.checkAnswer(question.correctAnswer, answer.answer);
      const pointsEarned = isCorrect ? question.points : 0;
      score += pointsEarned;

      return {
        questionId: answer.questionId,
        answer: answer.answer,
        isCorrect,
        pointsEarned,
      };
    });

    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const passed = percentage >= quiz.passingScore;
    const xpEarned = passed ? quiz.xpReward : Math.floor(quiz.xpReward * 0.25);

    const attempt = this.attemptRepository.create({
      userId,
      quizId,
      courseId: quiz.courseId || '',
      lessonId: quiz.lessonId,
      attemptNumber: attemptCount + 1,
      answers,
      score,
      maxScore,
      percentage,
      passed,
      timeSpent: submitDto.timeSpent,
      startedAt: submitDto.startedAt,
      completedAt: new Date(),
      xpEarned,
    });

    return this.attemptRepository.save(attempt);
  }

  async getAttempts(userId: string, quizId: string): Promise<QuizAttempt[]> {
    return this.attemptRepository.find({
      where: { userId, quizId },
      order: { attemptNumber: 'DESC' },
    });
  }

  async getBestAttempt(userId: string, quizId: string): Promise<QuizAttempt | null> {
    return this.attemptRepository.findOne({
      where: { userId, quizId },
      order: { percentage: 'DESC' },
    });
  }

  private checkAnswer(correctAnswer: string[], userAnswer: string[]): boolean {
    if (correctAnswer.length !== userAnswer.length) return false;
    const sortedCorrect = [...correctAnswer].sort();
    const sortedUser = [...userAnswer].sort();
    return sortedCorrect.every((val, idx) => val === sortedUser[idx]);
  }
}
