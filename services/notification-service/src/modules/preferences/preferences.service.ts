import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserNotificationPreference } from './entities/preference.entity';
import { NotificationChannel, NotificationType } from '../notifications/entities';

@Injectable()
export class PreferenceService {
  private readonly logger = new Logger(PreferenceService.name);

  constructor(
    @InjectRepository(UserNotificationPreference)
    private preferenceRepository: Repository<UserNotificationPreference>,
  ) {}

  async getUserPreferences(userId: string): Promise<UserNotificationPreference[]> {
    return this.preferenceRepository.find({
      where: { userId },
    });
  }

  async getUserPreferencesByType(
    userId: string,
    notificationType: NotificationType,
  ): Promise<UserNotificationPreference | null> {
    return this.preferenceRepository.findOne({
      where: { userId, notificationType },
    });
  }

  async updatePreference(
    userId: string,
    notificationType: NotificationType,
    preferenceData: Partial<UserNotificationPreference>,
  ): Promise<UserNotificationPreference> {
    let preference = await this.getUserPreferencesByType(userId, notificationType);

    if (!preference) {
      preference = this.preferenceRepository.create({
        userId,
        notificationType,
        ...preferenceData,
      });
    } else {
      Object.assign(preference, preferenceData);
    }

    return this.preferenceRepository.save(preference);
  }

  async getEnabledChannels(userId: string, notificationType: NotificationType): Promise<NotificationChannel[]> {
    const preference = await this.getUserPreferencesByType(userId, notificationType);

    if (!preference || !preference.isEnabled) {
      return [];
    }

    // Check if we're in quiet hours
    if (this.isInQuietHours(preference)) {
      // Only allow critical notifications during quiet hours
      if (notificationType === NotificationType.SECURITY || notificationType === NotificationType.TRANSACTIONAL) {
        return preference.enabledChannels;
      }
      return [];
    }

    return preference.enabledChannels;
  }

  private isInQuietHours(preference: UserNotificationPreference): boolean {
    if (!preference.quietHoursStart || !preference.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const timezone = preference.timezone || 'UTC';
    
    // Convert current time to user's timezone
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const currentHour = userTime.getHours();
    const currentMinute = userTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = preference.quietHoursStart.split(':').map(Number);
    const [endHour, endMinute] = preference.quietHoursEnd.split(':').map(Number);
    
    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;

    if (startTimeInMinutes < endTimeInMinutes) {
      return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
    } else {
      // Quiet hours span midnight
      return currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes <= endTimeInMinutes;
    }
  }

  async unsubscribeFromType(userId: string, notificationType: NotificationType): Promise<void> {
    await this.updatePreference(userId, notificationType, { isEnabled: false });
    this.logger.log(`User ${userId} unsubscribed from ${notificationType} notifications`);
  }

  async unsubscribeFromChannel(
    userId: string,
    notificationType: NotificationType,
    channel: NotificationChannel,
  ): Promise<void> {
    const preference = await this.getUserPreferencesByType(userId, notificationType);
    if (preference) {
      const updatedChannels = preference.enabledChannels.filter(ch => ch !== channel);
      await this.updatePreference(userId, notificationType, { enabledChannels: updatedChannels });
      this.logger.log(`User ${userId} unsubscribed from ${channel} channel for ${notificationType}`);
    }
  }

  async createDefaultPreferences(userId: string, email?: string, phoneNumber?: string): Promise<void> {
    const defaultPreferences: Array<Partial<UserNotificationPreference>> = [
      {
        userId,
        notificationType: NotificationType.TRANSACTIONAL,
        enabledChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        isEnabled: true,
        email,
        phoneNumber,
      },
      {
        userId,
        notificationType: NotificationType.SECURITY,
        enabledChannels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.IN_APP],
        isEnabled: true,
        email,
        phoneNumber,
      },
      {
        userId,
        notificationType: NotificationType.MARKETING,
        enabledChannels: [NotificationChannel.EMAIL],
        isEnabled: false,
        email,
      },
      {
        userId,
        notificationType: NotificationType.PRICE_ALERT,
        enabledChannels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
        isEnabled: true,
      },
    ];

    for (const pref of defaultPreferences) {
      const preference = this.preferenceRepository.create(pref);
      await this.preferenceRepository.save(preference);
    }

    this.logger.log(`Default preferences created for user ${userId}`);
  }
}
