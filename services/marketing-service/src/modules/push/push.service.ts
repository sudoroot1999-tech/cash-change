import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { 
  PushCampaign, 
  PushCampaignStatus,
  PushType,
  PushPriority 
} from '../../entities/PushCampaign.entity';
import { PushNotificationLog, PushStatus } from '../../entities/PushNotificationLog.entity';
import { DeviceToken } from '../../entities/DeviceToken.entity';
import { UserSegment } from '../../entities/UserSegment.entity';
import { PushNotificationService } from '../../integrations/push-notification.service';

@Injectable()
export class PushService {
  constructor(
    @InjectRepository(PushCampaign)
    private campaignRepo: Repository<PushCampaign>,
    @InjectRepository(PushNotificationLog)
    private logRepo: Repository<PushNotificationLog>,
    @InjectRepository(DeviceToken)
    private deviceTokenRepo: Repository<DeviceToken>,
    @InjectRepository(UserSegment)
    private segmentRepo: Repository<UserSegment>,
    private pushNotificationService: PushNotificationService,
  ) {}

  // Campaign Management
  async createCampaign(data: Partial<PushCampaign>): Promise<PushCampaign> {
    const campaign = this.campaignRepo.create(data);
    return this.campaignRepo.save(campaign);
  }

  async updateCampaign(id: string, data: Partial<PushCampaign>): Promise<PushCampaign> {
    await this.campaignRepo.update(id, data);
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async scheduleCampaign(id: string, scheduledAt: Date): Promise<PushCampaign> {
    return this.updateCampaign(id, {
      status: PushCampaignStatus.SCHEDULED,
      scheduledAt,
    });
  }

  async pauseCampaign(id: string): Promise<PushCampaign> {
    return this.updateCampaign(id, { status: PushCampaignStatus.PAUSED });
  }

  async cancelCampaign(id: string): Promise<PushCampaign> {
    return this.updateCampaign(id, { status: PushCampaignStatus.CANCELLED });
  }

  // Device Token Management
  async registerDeviceToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android' | 'web',
    deviceInfo?: any
  ): Promise<DeviceToken> {
    let deviceToken = await this.deviceTokenRepo.findOne({ where: { token } });

    if (deviceToken) {
      // Update existing token
      await this.deviceTokenRepo.update(deviceToken.id, {
        userId,
        platform,
        isActive: true,
        lastUsedAt: new Date(),
        ...deviceInfo,
      });
      const updated = await this.deviceTokenRepo.findOne({ where: { id: deviceToken.id } });
      if (!updated) throw new NotFoundException('Device token not found after update');
      return updated;
    }

    // Create new token
    const newDeviceToken = this.deviceTokenRepo.create({
      userId,
      token,
      platform,
      isActive: true,
      isOptedIn: true,
      preferences: {
        marketing: true,
        transactional: true,
        priceAlerts: true,
        tradingSignals: true,
        news: true,
        promotions: true,
      },
      lastUsedAt: new Date(),
      ...deviceInfo,
    });

    const saved = await this.deviceTokenRepo.save(newDeviceToken);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async updateDevicePreferences(
    userId: string,
    preferences: any
  ): Promise<void> {
    await this.deviceTokenRepo.update({ userId }, { preferences });
  }

  async optOutPushNotifications(userId: string): Promise<void> {
    await this.deviceTokenRepo.update({ userId }, { isOptedIn: false });
  }

  async optInPushNotifications(userId: string): Promise<void> {
    await this.deviceTokenRepo.update({ userId }, { isOptedIn: true });
  }

  // Send Campaign
  async sendCampaign(campaignId: string): Promise<void> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    if (campaign.status !== PushCampaignStatus.DRAFT && 
        campaign.status !== PushCampaignStatus.SCHEDULED) {
      throw new BadRequestException('Campaign cannot be sent in current status');
    }

    // Mark as sending
    await this.campaignRepo.update(campaignId, { status: PushCampaignStatus.SENDING });

    // Get target devices
    const devices = await this.getTargetDevices(campaign);

    // Send notifications
    let sent = 0;
    let delivered = 0;
    let failed = 0;

    for (const device of devices) {
      try {
        // Check if user opted in and has correct preferences
        if (!device.isOptedIn || !this.checkPreferences(campaign, device)) {
          continue;
        }

        // Personalize content if needed
        const title = campaign.isPersonalized 
          ? this.personalizeContent(campaign.title, device)
          : campaign.title;
        const message = campaign.isPersonalized 
          ? this.personalizeContent(campaign.message, device)
          : campaign.message;

        // Send notification
        const messageId = await this.pushNotificationService.sendToDevice(
          device.token,
          {
            title,
            body: message,
            imageUrl: campaign.imageUrl,
            icon: campaign.iconUrl,
            clickAction: campaign.clickAction,
            data: campaign.data,
          },
          device.platform as any
        );

        // Log the notification
        await this.logNotification(
          campaign.id,
          device.userId,
          device.token,
          device.platform,
          title,
          message,
          PushStatus.SENT,
          messageId
        );

        sent++;
        delivered++;

        // Update device stats
        await this.deviceTokenRepo.increment(
          { id: device.id },
          'totalNotificationsSent',
          1
        );
      } catch (error) {
        console.error(`Failed to send push to device ${device.id}:`, error);
        
        await this.logNotification(
          campaign.id,
          device.userId,
          device.token,
          device.platform,
          campaign.title,
          campaign.message,
          PushStatus.FAILED,
          null,
          error.message
        );

        failed++;
      }
    }

    // Update campaign stats
    await this.campaignRepo.update(campaignId, {
      status: PushCampaignStatus.SENT,
      sentAt: new Date(),
      totalRecipients: devices.length,
      sent,
      delivered,
      failed,
      deliveryRate: devices.length > 0 ? (delivered / devices.length) * 100 : 0,
    });
  }

  private async getTargetDevices(campaign: PushCampaign): Promise<DeviceToken[]> {
    let query = this.deviceTokenRepo
      .createQueryBuilder('device')
      .where('device.isActive = :isActive', { isActive: true })
      .andWhere('device.isOptedIn = :isOptedIn', { isOptedIn: true });

    if (campaign.segmentId) {
      const segment = await this.segmentRepo.findOne({ where: { id: campaign.segmentId } });
      if (segment) {
        // Join with users based on segment criteria
        // This would need integration with your user service
      }
    }

    if (campaign.targetCriteria) {
      const criteria = campaign.targetCriteria;

      if (criteria.platforms?.length) {
        query.andWhere('device.platform IN (:...platforms)', {
          platforms: criteria.platforms
        });
      }

      if (criteria.languages?.length) {
        query.andWhere('device.language IN (:...languages)', {
          languages: criteria.languages
        });
      }
    }

    return query.getMany();
  }

  private checkPreferences(campaign: PushCampaign, device: DeviceToken): boolean {
    const prefs = device.preferences || {};

    switch (campaign.type) {
      case PushType.MARKETING:
        return prefs.marketing !== false;
      case PushType.TRANSACTIONAL:
        return prefs.transactional !== false;
      case PushType.PRICE_ALERT:
        return prefs.priceAlerts !== false;
      case PushType.TRADE_SIGNAL:
        return prefs.tradingSignals !== false;
      case PushType.NEWS:
        return prefs.news !== false;
      case PushType.PROMOTIONAL:
        return prefs.promotions !== false;
      default:
        return true;
    }
  }

  private personalizeContent(content: string, device: DeviceToken): string {
    // Simple personalization - in production use a template engine
    return content.replace(/\{\{userId\}\}/g, device.userId);
  }

  private async logNotification(
    campaignId: string,
    userId: string,
    deviceToken: string,
    platform: string,
    title: string,
    message: string,
    status: PushStatus,
    providerMessageId?: string,
    errorMessage?: string
  ): Promise<PushNotificationLog> {
    const log = this.logRepo.create({
      campaignId,
      userId,
      deviceToken,
      platform,
      title,
      message,
      status,
      providerMessageId,
      errorMessage,
      sentAt: status === PushStatus.SENT ? new Date() : undefined,
    });

    return this.logRepo.save(log);
  }

  // Send Immediate Notification
  async sendImmediate(
    userId: string,
    title: string,
    message: string,
    type: PushType = PushType.TRANSACTIONAL,
    data?: any
  ): Promise<void> {
    const devices = await this.deviceTokenRepo.find({
      where: { userId, isActive: true, isOptedIn: true }
    });

    for (const device of devices) {
      try {
        await this.pushNotificationService.sendToDevice(
          device.token,
          {
            title,
            body: message,
            data,
          },
          device.platform as any
        );

        await this.logNotification(
          null,
          userId,
          device.token,
          device.platform,
          title,
          message,
          PushStatus.SENT
        );
      } catch (error) {
        console.error(`Failed to send immediate push:`, error);
      }
    }
  }

  // Behavioral Triggers
  async sendPriceAlert(
    userId: string,
    symbol: string,
    currentPrice: number,
    targetPrice: number,
    direction: 'above' | 'below'
  ): Promise<void> {
    const title = `Price Alert: ${symbol}`;
    const message = `${symbol} is now ${direction} ${targetPrice}. Current price: ${currentPrice}`;

    await this.sendImmediate(userId, title, message, PushType.PRICE_ALERT, {
      type: 'price_alert',
      symbol,
      currentPrice,
      targetPrice,
      direction,
    });
  }

  async sendTradeExecuted(
    userId: string,
    symbol: string,
    side: string,
    amount: number,
    price: number
  ): Promise<void> {
    const title = 'Trade Executed';
    const message = `Your ${side} order for ${amount} ${symbol} at ${price} has been executed.`;

    await this.sendImmediate(userId, title, message, PushType.TRANSACTIONAL, {
      type: 'trade_executed',
      symbol,
      side,
      amount,
      price,
    });
  }

  async sendDepositConfirmed(
    userId: string,
    currency: string,
    amount: number
  ): Promise<void> {
    const title = 'Deposit Confirmed';
    const message = `Your deposit of ${amount} ${currency} has been confirmed.`;

    await this.sendImmediate(userId, title, message, PushType.TRANSACTIONAL, {
      type: 'deposit_confirmed',
      currency,
      amount,
    });
  }

  // Analytics
  async getCampaignAnalytics(campaignId: string): Promise<any> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const logs = await this.logRepo.find({ where: { campaignId } });

    const clicked = logs.filter(l => l.status === PushStatus.CLICKED).length;
    const dismissed = logs.filter(l => l.status === PushStatus.DISMISSED).length;

    return {
      campaign,
      totalRecipients: campaign.totalRecipients,
      sent: campaign.sent,
      delivered: campaign.delivered,
      clicked: campaign.clicked,
      dismissed: campaign.dismissed,
      failed: campaign.failed,
      deliveryRate: campaign.deliveryRate,
      clickRate: campaign.clickRate,
      clickThroughRate: campaign.delivered > 0 
        ? (clicked / campaign.delivered) * 100 
        : 0,
      dismissRate: campaign.delivered > 0 
        ? (dismissed / campaign.delivered) * 100 
        : 0,
    };
  }

  // Handle Events
  async handleNotificationClicked(
    providerMessageId: string,
    clickedAction?: string
  ): Promise<void> {
    const log = await this.logRepo.findOne({ where: { providerMessageId } });
    if (!log) return;

    await this.logRepo.update(log.id, {
      status: PushStatus.CLICKED,
      clickedAt: new Date(),
      clickedAction,
    });

    // Update campaign stats
    if (log.campaignId) {
      await this.campaignRepo.increment({ id: log.campaignId }, 'clicked', 1);
      await this.updateCampaignRates(log.campaignId);
    }

    // Update device stats
    const device = await this.deviceTokenRepo.findOne({ where: { token: log.deviceToken } });
    if (device) {
      await this.deviceTokenRepo.increment(
        { id: device.id },
        'totalNotificationsClicked',
        1
      );
    }
  }

  async handleNotificationDismissed(providerMessageId: string): Promise<void> {
    const log = await this.logRepo.findOne({ where: { providerMessageId } });
    if (!log) return;

    await this.logRepo.update(log.id, {
      status: PushStatus.DISMISSED,
      dismissedAt: new Date(),
    });

    if (log.campaignId) {
      await this.campaignRepo.increment({ id: log.campaignId }, 'dismissed', 1);
    }
  }

  private async updateCampaignRates(campaignId: string): Promise<void> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) return;

    const clickRate = campaign.delivered > 0 
      ? (campaign.clicked / campaign.delivered) * 100 
      : 0;

    await this.campaignRepo.update(campaignId, { clickRate });
  }
}
