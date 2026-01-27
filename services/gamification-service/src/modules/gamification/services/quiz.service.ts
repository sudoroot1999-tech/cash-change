import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz, QuizDifficulty, QuizCategory } from '../entities/quiz.entity';
import { QuizSession, QuizSessionStatus } from '../entities/quiz-session.entity';
import { LevelService } from './level.service';
import { RewardService } from './reward.service';
import { XpSource } from '../entities/xp-transaction.entity';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quiz)
    private quizRepository: Repository<Quiz>,
    @InjectRepository(QuizSession)
    private sessionRepository: Repository<QuizSession>,
    private levelService: LevelService,
    private rewardService: RewardService,
  ) {}

  async getAvailableQuizzes(category?: QuizCategory, difficulty?: QuizDifficulty) {
    const query: any = { isActive: true };
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;

    return await this.quizRepository.find({
      where: query,
      select: ['id', 'title', 'description', 'category', 'difficulty', 'timeLimit', 'xpReward', 'tokenReward', 'isDaily'],
    });
  }

  async getDailyQuiz() {
    return await this.quizRepository.findOne({
      where: { isDaily: true, isActive: true },
      select: ['id', 'title', 'description', 'category', 'difficulty', 'timeLimit', 'xpReward', 'tokenReward'],
    });
  }

  async startQuiz(userId: string, quizId: string): Promise<QuizSession> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (!quiz.isActive) {
      throw new BadRequestException('Quiz is not active');
    }

    // Check if user has an incomplete session
    const existingSession = await this.sessionRepository.findOne({
      where: {
        userId,
        quizId,
        status: QuizSessionStatus.IN_PROGRESS,
      },
    });

    if (existingSession) {
      return existingSession;
    }

    const session = this.sessionRepository.create({
      userId,
      quizId,
      answers: {},
      totalQuestions: quiz.questions.length,
      startedAt: new Date(),
      status: QuizSessionStatus.IN_PROGRESS,
    });

    return await this.sessionRepository.save(session);
  }

  async getQuizQuestions(sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['quiz'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Return questions without correct answers
    const questions = session.quiz.questions.map((q: any) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      category: q.category,
      points: q.points || 10,
    }));

    return {
      sessionId: session.id,
      questions,
      timeLimit: session.quiz.timeLimit,
      startedAt: session.startedAt,
    };
  }

  async submitAnswer(sessionId: string, questionId: string, answerId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['quiz'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== QuizSessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Session is not in progress');
    }

    // Check time limit
    const elapsed = Date.now() - session.startedAt.getTime();
    if (elapsed > session.quiz.timeLimit * 1000) {
      session.status = QuizSessionStatus.TIMEOUT;
      await this.sessionRepository.save(session);
      throw new BadRequestException('Time limit exceeded');
    }

    session.answers[questionId] = answerId;
    return await this.sessionRepository.save(session);
  }

  async completeQuiz(sessionId: string): Promise<QuizSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['quiz'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== QuizSessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Session is not in progress');
    }

    // Calculate results
    let correctAnswers = 0;
    let totalPoints = 0;

    for (const question of session.quiz.questions) {
      const userAnswer = session.answers[question.id];
      if (userAnswer === question.correctAnswer) {
        correctAnswers++;
        totalPoints += question.points || 10;
      }
    }

    session.correctAnswers = correctAnswers;
    session.score = totalPoints;
    session.timeTaken = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
    session.status = QuizSessionStatus.COMPLETED;
    session.completedAt = new Date();

    const passingScore = (session.quiz.passingScore / 100) * (session.totalQuestions * 10);
    session.isPassed = totalPoints >= passingScore;

    if (session.isPassed) {
      // Award rewards
      session.xpEarned = session.quiz.xpReward;
      session.tokensEarned = session.quiz.tokenReward;

      await this.levelService.addXp(session.userId, session.xpEarned, XpSource.QUIZ_COMPLETED);
      
      if (session.tokensEarned > 0) {
        await this.rewardService.createReward({
          userId: session.userId,
          type: 'tokens',
          title: 'Quiz Completion Reward',
          description: `Quiz: ${session.quiz.title}`,
          amount: session.tokensEarned,
          sourceType: 'quiz',
          sourceId: session.quiz.id,
        });
      }

      // Bonus for perfect score
      if (correctAnswers === session.totalQuestions) {
        await this.levelService.addXp(session.userId, 50, XpSource.QUIZ_PERFECT_SCORE);
      }
    }

    // Update quiz stats
    session.quiz.playCount++;
    const newAvg = 
      (session.quiz.avgScore * (session.quiz.playCount - 1) + session.score) / 
      session.quiz.playCount;
    session.quiz.avgScore = newAvg;
    await this.quizRepository.save(session.quiz);

    return await this.sessionRepository.save(session);
  }

  async getUserQuizStats(userId: string) {
    const sessions = await this.sessionRepository.find({
      where: { userId, status: QuizSessionStatus.COMPLETED },
    });

    const totalQuizzes = sessions.length;
    const passedQuizzes = sessions.filter(s => s.isPassed).length;
    const totalXp = sessions.reduce((sum, s) => sum + s.xpEarned, 0);
    const avgScore = totalQuizzes > 0 
      ? sessions.reduce((sum, s) => sum + s.score, 0) / totalQuizzes 
      : 0;

    return {
      totalQuizzes,
      passedQuizzes,
      passRate: totalQuizzes > 0 ? (passedQuizzes / totalQuizzes) * 100 : 0,
      totalXp,
      avgScore,
    };
  }

  async getLeaderboard(category?: QuizCategory, limit: number = 100) {
    const query = this.sessionRepository
      .createQueryBuilder('session')
      .select('session.userId', 'userId')
      .addSelect('COUNT(*)', 'totalQuizzes')
      .addSelect('SUM(session.score)', 'totalScore')
      .addSelect('AVG(session.score)', 'avgScore')
      .addSelect('SUM(CASE WHEN session.isPassed = true THEN 1 ELSE 0 END)', 'passedQuizzes')
      .where('session.status = :status', { status: QuizSessionStatus.COMPLETED })
      .groupBy('session.userId')
      .orderBy('totalScore', 'DESC')
      .limit(limit);

    if (category) {
      query
        .innerJoin('session.quiz', 'quiz')
        .andWhere('quiz.category = :category', { category });
    }

    return await query.getRawMany();
  }

  async createQuiz(quizData: Partial<Quiz>): Promise<Quiz> {
    const quiz = this.quizRepository.create(quizData);
    return await this.quizRepository.save(quiz);
  }
}
