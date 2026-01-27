import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param 
} from '@nestjs/common';
import { PushService } from './push.service';
import { PushCampaign, PushType } from '../../entities/PushCampaign.entity';

@Controller('marketing/push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('campaigns')
  async createCampaign(@Body() data: Partial<PushCampaign>) {
    return this.pushService.createCampaign(data);
  }

  @Put('campaigns/:id')
  async updateCampaign(
    @Param('id') id: string,
    @Body() data: Partial<PushCampaign>
  ) {
    return this.pushService.updateCampaign(id, data);
  }

  @Post('campaigns/:id/schedule')
  async scheduleCampaign(
    @Param('id') id: string,
    @Body('scheduledAt') scheduledAt: Date
  ) {
    return this.pushService.scheduleCampaign(id, scheduledAt);
  }

  @Post('campaigns/:id/send')
  async sendCampaign(@Param('id') id: string) {
    await this.pushService.sendCampaign(id);
    return { success: true, message: 'Campaign sent' };
  }

  @Post('campaigns/:id/pause')
  async pauseCampaign(@Param('id') id: string) {
    return this.pushService.pauseCampaign(id);
  }

  @Post('campaigns/:id/cancel')
  async cancelCampaign(@Param('id') id: string) {
    return this.pushService.cancelCampaign(id);
  }

  @Get('campaigns/:id/analytics')
  async getCampaignAnalytics(@Param('id') id: string) {
    return this.pushService.getCampaignAnalytics(id);
  }

  // Device Token Management
  @Post('devices/register')
  async registerDeviceToken(
    @Body('userId') userId: string,
    @Body('token') token: string,
    @Body('platform') platform: 'ios' | 'android' | 'web',
    @Body('deviceInfo') deviceInfo?: any
  ) {
    return this.pushService.registerDeviceToken(userId, token, platform, deviceInfo);
  }

  @Put('devices/:userId/preferences')
  async updateDevicePreferences(
    @Param('userId') userId: string,
    @Body('preferences') preferences: any
  ) {
    await this.pushService.updateDevicePreferences(userId, preferences);
    return { success: true };
  }

  @Post('devices/:userId/opt-out')
  async optOutPushNotifications(@Param('userId') userId: string) {
    await this.pushService.optOutPushNotifications(userId);
    return { success: true };
  }

  @Post('devices/:userId/opt-in')
  async optInPushNotifications(@Param('userId') userId: string) {
    await this.pushService.optInPushNotifications(userId);
    return { success: true };
  }

  // Immediate Notifications
  @Post('send-immediate')
  async sendImmediate(
    @Body('userId') userId: string,
    @Body('title') title: string,
    @Body('message') message: string,
    @Body('type') type?: PushType,
    @Body('data') data?: any
  ) {
    await this.pushService.sendImmediate(userId, title, message, type, data);
    return { success: true };
  }

  // Behavioral Triggers
  @Post('send-price-alert')
  async sendPriceAlert(
    @Body('userId') userId: string,
    @Body('symbol') symbol: string,
    @Body('currentPrice') currentPrice: number,
    @Body('targetPrice') targetPrice: number,
    @Body('direction') direction: 'above' | 'below'
  ) {
    await this.pushService.sendPriceAlert(userId, symbol, currentPrice, targetPrice, direction);
    return { success: true };
  }

  @Post('send-trade-executed')
  async sendTradeExecuted(
    @Body('userId') userId: string,
    @Body('symbol') symbol: string,
    @Body('side') side: string,
    @Body('amount') amount: number,
    @Body('price') price: number
  ) {
    await this.pushService.sendTradeExecuted(userId, symbol, side, amount, price);
    return { success: true };
  }

  @Post('send-deposit-confirmed')
  async sendDepositConfirmed(
    @Body('userId') userId: string,
    @Body('currency') currency: string,
    @Body('amount') amount: number
  ) {
    await this.pushService.sendDepositConfirmed(userId, currency, amount);
    return { success: true };
  }

  // Webhooks
  @Post('webhooks/clicked')
  async handleNotificationClicked(@Body() data: any) {
    await this.pushService.handleNotificationClicked(
      data.providerMessageId,
      data.clickedAction
    );
    return { success: true };
  }

  @Post('webhooks/dismissed')
  async handleNotificationDismissed(@Body() data: any) {
    await this.pushService.handleNotificationDismissed(data.providerMessageId);
    return { success: true };
  }
}
