import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
  RabbitMQService,
  QUEUES,
  UserRegisteredEvent,
  UserLoginEvent,
  EmailVerifiedEvent,
  TwoFactorEnabledEvent,
} from '@exchange/common';
import { LevelService } from '../services/level.service';
import { BadgeService } from '../services/badge.service';
import { LoginStreakService } from '../services/login-streak.service';

/**
 * Consumer for authentication events to award gamification rewards
 */
@Injectable()
export class AuthEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(AuthEventsConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly levelService: LevelService,
    private readonly badgeService: BadgeService,
    private readonly loginStreakService: LoginStreakService,
  ) {}

  async onModuleInit() {
    // Subscribe to user registered events
    await this.rabbitmq.subscribe<UserRegisteredEvent>(
      QUEUES.GAMIFICATION_USER_REGISTERED,
      async (event) => {
        await this.handleUserRegistered(event);
      },
    );

    // Subscribe to user login events
    await this.rabbitmq.subscribe<UserLoginEvent>(
      QUEUES.GAMIFICATION_USER_LOGIN,
      async (event) => {
        await this.handleUserLogin(event);
      },
    );

    // Subscribe to email verified events
    await this.rabbitmq.subscribe<EmailVerifiedEvent>(
      QUEUES.GAMIFICATION_EMAIL_VERIFIED,
      async (event) => {
        await this.handleEmailVerified(event);
      },
    );

    // Subscribe to 2FA enabled events
    await this.rabbitmq.subscribe<TwoFactorEnabledEvent>(
      QUEUES.GAMIFICATION_TWO_FACTOR_ENABLED,
      async (event) => {
        await this.handleTwoFactorEnabled(event);
      },
    );

    this.logger.log('✅ Auth event consumers started (Gamification)');
  }

  /**
   * Handle user registered event - award welcome bonus
   */
  private async handleUserRegistered(event: UserRegisteredEvent): Promise<void> {
    try {
      this.logger.log(`New user registered for gamification: ${event.userId}`);

      // Initialize user level
      await this.levelService.initializeUser(event.userId);

      // Award welcome bonus XP
      await this.levelService.addXp(
        event.userId,
        100,
        'REGISTRATION',
        undefined,
      );

      // Award "Welcome" badge
      await this.badgeService.awardBadge(event.userId, 'welcome', 'Welcome Badge');

      this.logger.log(`Gamification initialized for user ${event.userId}`);
    } catch (error) {
      this.logger.error(`Error handling UserRegisteredEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Handle user login event - update login streak
   */
  private async handleUserLogin(event: UserLoginEvent): Promise<void> {
    try {
      this.logger.log(`User login for gamification: ${event.userId}`);

      // Update login streak
      const streak = await this.loginStreakService.updateStreak(event.userId);

      // Award daily login XP
      await this.levelService.addXp(
        event.userId,
        10,
        'DAILY_LOGIN',
        undefined,
      );

      // Award streak bonuses
      if (streak.currentStreak >= 7) {
        await this.levelService.addXp(event.userId, 50, 'LOGIN_STREAK_7', undefined);
        await this.badgeService.checkStreakBadges(event.userId, streak.currentStreak);
      }

      if (streak.currentStreak >= 30) {
        await this.levelService.addXp(event.userId, 200, 'LOGIN_STREAK_30', undefined);
      }
    } catch (error) {
      this.logger.error(`Error handling UserLoginEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Handle email verified event - award XP
   */
  private async handleEmailVerified(event: EmailVerifiedEvent): Promise<void> {
    try {
      this.logger.log(`Email verified for gamification: ${event.userId}`);

      // Award email verification XP
      await this.levelService.addXp(
        event.userId,
        50,
        'EMAIL_VERIFIED',
        undefined,
      );

      // Award "Verified" badge
      await this.badgeService.awardBadge(event.userId, 'verified', 'Verified User');
    } catch (error) {
      this.logger.error(`Error handling EmailVerifiedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Handle 2FA enabled event - award security bonus
   */
  private async handleTwoFactorEnabled(event: TwoFactorEnabledEvent): Promise<void> {
    try {
      this.logger.log(`2FA enabled for gamification: ${event.userId}`);

      // Award security XP
      await this.levelService.addXp(
        event.userId,
        100,
        'TWO_FACTOR_ENABLED',
        undefined,
      );

      // Award "Security Champion" badge
      await this.badgeService.awardBadge(event.userId, 'security', 'Security Champion');
    } catch (error) {
      this.logger.error(`Error handling TwoFactorEnabledEvent: ${(error as Error).message}`);
    }
  }
}
