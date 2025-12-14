import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from './entities/preference.entity';

@Injectable()
export class PreferencesService {
  constructor(
    @InjectRepository(NotificationPreference)
    private readonly prefRepo: Repository<NotificationPreference>,
  ) {}

  async getOrCreate(userId: string): Promise<NotificationPreference> {
    let pref = await this.prefRepo.findOne({ where: { userId } });
    if (!pref) {
      pref = this.prefRepo.create({ userId });
      pref = await this.prefRepo.save(pref);
    }
    return pref;
  }

  async update(userId: string, data: Partial<NotificationPreference>): Promise<NotificationPreference> {
    const pref = await this.getOrCreate(userId);
    Object.assign(pref, data);
    return this.prefRepo.save(pref);
  }

  async isChannelEnabled(userId: string, channel: string): Promise<boolean> {
    const pref = await this.getOrCreate(userId);
    switch (channel) {
      case 'email': return pref.emailEnabled;
      case 'sms': return pref.smsEnabled;
      case 'push': return pref.pushEnabled;
      case 'in_app': return pref.inAppEnabled;
      case 'telegram': return pref.telegramEnabled;
      case 'discord': return pref.discordEnabled;
      default: return false;
    }
  }
}
