import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
  RabbitMQService,
  QUEUES,
  UserRegisteredEvent,
  PasswordResetRequestedEvent,
  PasswordChangedEvent,
  TwoFactorEnabledEvent,
  TwoFactorDisabledEvent,
  EmailVerificationRequestedEvent,
  EmailVerifiedEvent,
  AccountLockedEvent,
} from '@exchange/common';
import { NotificationCoreService } from '../modules/notifications/notifications.service';
import { NotificationChannel, NotificationType } from '../modules/notifications/entities';


/**
 * Consumer for authentication events
 * sendNotifications notifications to users about authentication activities
 */
@Injectable()
export class AuthEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(AuthEventsConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly notificationService: NotificationCoreService,
  ) {}

  async onModuleInit() {
    // Subscribe to user registered events
    await this.rabbitmq.subscribe<UserRegisteredEvent>(
      QUEUES.USER_REGISTERED,
      async (event) => {
        await this.handleUserRegistered(event);
      },
    );

    // Subscribe to password reset requested events
    await this.rabbitmq.subscribe<PasswordResetRequestedEvent>(
      QUEUES.PASSWORD_RESET_REQUESTED,
      async (event) => {
        await this.handlePasswordResetRequested(event);
      },
    );

    // Subscribe to password changed events
    await this.rabbitmq.subscribe<PasswordChangedEvent>(
      QUEUES.PASSWORD_CHANGED,
      async (event) => {
        await this.handlePasswordChanged(event);
      },
    );

    // Subscribe to 2FA enabled events
    await this.rabbitmq.subscribe<TwoFactorEnabledEvent>(
      QUEUES.TWO_FACTOR_ENABLED,
      async (event) => {
        await this.handleTwoFactorEnabled(event);
      },
    );

    // Subscribe to 2FA disabled events
    await this.rabbitmq.subscribe<TwoFactorDisabledEvent>(
      QUEUES.TWO_FACTOR_DISABLED,
      async (event) => {
        await this.handleTwoFactorDisabled(event);
      },
    );

    // Subscribe to email verification requested events
    await this.rabbitmq.subscribe<EmailVerificationRequestedEvent>(
      QUEUES.EMAIL_VERIFICATION_REQUESTED,
      async (event) => {
        await this.handleEmailVerificationRequested(event);
      },
    );

    // Subscribe to email verified events
    await this.rabbitmq.subscribe<EmailVerifiedEvent>(
      QUEUES.EMAIL_VERIFIED,
      async (event) => {
        await this.handleEmailVerified(event);
      },
    );

    // Subscribe to account locked events
    await this.rabbitmq.subscribe<AccountLockedEvent>(
      QUEUES.ACCOUNT_LOCKED,
      async (event) => {
        await this.handleAccountLocked(event);
      },
    );

    this.logger.log('✅ Auth event consumers started');
  }

  /**
   * Handle user registered event - sendNotification welcome email
   */
  private async handleUserRegistered(event: UserRegisteredEvent): Promise<void> {
    try {
      this.logger.log(`New user registered: ${event.email}`);

      await this.notificationService.sendNotification({
        userId: event.userId,
        type: NotificationType.COMMON,
        channels: [NotificationChannel.EMAIL,NotificationChannel.IN_APP],
        subject: 'Welcome to Our Crypto Exchange!',
        content: `Welcome ${event.username || event.email}! Thank you for registering with us.`,
        data: {
          username: event.username,
          email: event.email,
          registeredAt: event.registeredAt,
        },
      });
    } catch (error) {
      this.logger.error(`Error handling UserRegisteredEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Handle password reset requested - sendNotification reset link
   */
  private async handlePasswordResetRequested(event: PasswordResetRequestedEvent): Promise<void> {
    try {
      this.logger.log(`Password reset requested: ${event.email}`);

      await this.notificationService.sendNotification({
        userId: event.userId,
        type: NotificationType.SECURITY,
        channels: [NotificationChannel.EMAIL],
        subject: 'Password Reset Request',
        content: 'You requested a password reset. Click the link to reset your password.',
        data: {
          email: event.email,
          ipAddress: event.ipAddress,
          requestedAt: event.requestedAt,
          // Reset link should be generated and included here
        },
      });
    } catch (error) {
      this.logger.error(`Error handling PasswordResetRequestedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Handle password changed - notify user of security change
   */
  private async handlePasswordChanged(event: PasswordChangedEvent): Promise<void> {
    try {
      this.logger.log(`Password changed: ${event.email}`);

      await this.notificationService.sendNotification({
        userId: event.userId,
        type: NotificationType.SECURITY,
        channels: [NotificationChannel.IN_APP,NotificationChannel.EMAIL],
        subject: 'Your Password Was Changed',
        content: 'Your account password has been successfully changed.',
        data: {
          email: event.email,
          changedBy: event.changedBy,
          changedAt: event.changedAt,
        },
      });
    } catch (error) {
      this.logger.error(`Error handling PasswordChangedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Handle 2FA enabled - confirm security enhancement
   */
  private async handleTwoFactorEnabled(event: TwoFactorEnabledEvent): Promise<void> {
    try {
      this.logger.log(`2FA enabled: ${event.email}`);

      await this.notificationService.sendNotification({
        userId: event.userId,
        type: NotificationType.SECURITY,
        channels: [NotificationChannel.EMAIL,NotificationChannel.IN_APP],
        subject: 'Two-Factor Authentication Enabled',
        content: `Two-factor authentication via ${event.method} has been enabled on your account.`,
        data: {
          email: event.email,
          method: event.method,
          enabledAt: event.enabledAt,
        },
      });
    } catch (error) {
      this.logger.error(`Error handling TwoFactorEnabledEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Handle 2FA disabled - security alert
   */
  private async handleTwoFactorDisabled(event: TwoFactorDisabledEvent): Promise<void> {
    try {
      this.logger.log(`2FA disabled: ${event.email}`);

      await this.notificationService.sendNotification({
        userId: event.userId,
        type: NotificationType.SECURITY,
        channels: [NotificationChannel.EMAIL,NotificationChannel.IN_APP],
        subject: 'Two-Factor Authentication Disabled',
        content: 'Two-factor authentication has been disabled on your account. If this was not you, please contact support immediately.',
        data: {
          email: event.email,
          disabledAt: event.disabledAt,
        },
        priority: 3,
      });
    } catch (error) {
      this.logger.error(`Error handling TwoFactorDisabledEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Handle email verification requested - sendNotification verification link
   */
  private async handleEmailVerificationRequested(event: EmailVerificationRequestedEvent): Promise<void> {
    try {
      this.logger.log(`Email verification requested: ${event.email}`);

      await this.notificationService.sendNotification({
        userId: event.userId,
        type: NotificationType.SECURITY,
        channels: [NotificationChannel.EMAIL],
        subject: 'Verify Your Email Address',
        content: 'Please click the link below to verify your email address.',
        data: {
          email: event.email,
          requestedAt: event.requestedAt,
          // Verification link should be generated and included here
        },
      });
    } catch (error) {
      this.logger.error(`Error handling EmailVerificationRequestedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Handle email verified - confirmation
   */
  private async handleEmailVerified(event: EmailVerifiedEvent): Promise<void> {
    try {
      this.logger.log(`Email verified: ${event.email}`);

      await this.notificationService.sendNotification({
        userId: event.userId,
        type: NotificationType.INFO,
        channels: [NotificationChannel.IN_APP],
        subject: 'Email Verified Successfully',
        content: 'Your email has been verified. You now have full access to all features.',
        data: {
          email: event.email,
          verifiedAt: event.verifiedAt,
        },
      });
    } catch (error) {
      this.logger.error(`Error handling EmailVerifiedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Handle account locked - security alert
   */
  private async handleAccountLocked(event: AccountLockedEvent): Promise<void> {
    try {
      this.logger.log(`Account locked: ${event.email}`);

      await this.notificationService.sendNotification({
        userId: event.userId,
        type: NotificationType.SECURITY,
        channels: [NotificationChannel.EMAIL,NotificationChannel.IN_APP,NotificationChannel.PUSH],
        subject: 'Account Locked',
        content: `Your account has been locked due to: ${event.reason}. Please contact support.`,
        data: {
          email: event.email,
          reason: event.reason,
          lockedAt: event.lockedAt,
        },
        priority: 3,
      });
    } catch (error) {
      this.logger.error(`Error handling AccountLockedEvent: ${(error as Error).message}`);
    }
  }
}
