import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginStreak } from '../entities/login-streak.entity';
import { BadgeService } from './badge.service';

@Injectable()
export class LoginStreakService {
  private readonly logger = new Logger(LoginStreakService.name);

  constructor(
    @InjectRepository(LoginStreak)
    private readonly loginStreakRepository: Repository<LoginStreak>,
    private readonly badgeService: BadgeService,
  ) {}

  async recordLogin(userId: string): Promise<LoginStreak> {
    let streak = await this.loginStreakRepository.findOne({
      where: { userId },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!streak) {
      streak = this.loginStreakRepository.create({
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastLoginDate: today,
        totalLogins: 1,
      });
    } else {
      const lastLogin = new Date(streak.lastLoginDate);
      lastLogin.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor(
        (today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysDiff === 0) {
        return streak;
      } else if (daysDiff === 1) {
        streak.currentStreak += 1;
        streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
      } else {
        streak.currentStreak = 1;
      }

      streak.lastLoginDate = today;
      streak.totalLogins += 1;
    }

    await this.loginStreakRepository.save(streak);

    await this.badgeService.checkAndAwardBadges(userId, 'login_streak', {
      streakDays: streak.currentStreak,
    });

    return streak;
  }

  async getLoginStreak(userId: string): Promise<LoginStreak> {
    const streak = await this.loginStreakRepository.findOne({
      where: { userId },
    });

    if (!streak) {
      return this.loginStreakRepository.create({
        userId,
        currentStreak: 0,
        longestStreak: 0,
        totalLogins: 0,
      });
    }

    return streak;
  }
}
