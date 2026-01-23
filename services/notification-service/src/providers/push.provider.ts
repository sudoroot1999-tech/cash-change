import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as apn from 'apn';
import { DEVICE_PLATFORM, DevicePlatform } from '@exchange/common';

export interface PushPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  platform: DevicePlatform;
  imageUrl?: string;
}

@Injectable()
export class PushProvider {
  private readonly logger = new Logger(PushProvider.name);
  private fcmApp: admin.app.App;
  private fcmInitialized = false;
  private apnsProvider: apn.Provider | null = null;
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {
    this.initializeFCM();
    this.initializeAPNS();
  }

  private initializeFCM() {
    try {
      const projectId = this.configService.get<string>('FCM_PROJECT_ID');
      const privateKey = this.configService.get<string>('FCM_PRIVATE_KEY')?.replace(/\\n/g, '\n');
      const clientEmail = this.configService.get<string>('FCM_CLIENT_EMAIL');

      if (projectId && privateKey && clientEmail && privateKey.length > 100) {
        this.fcmApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            privateKey,
            clientEmail,
          }),
        });
        this.fcmInitialized = true;
        this.isConfigured = true;
        this.logger.log('✅ FCM initialized successfully');
      }
    } catch (error: any) {
      this.logger.warn(`⚠️  FCM initialization failed: ${error.message}`);
    }
  }

  private initializeAPNS() {
    try {
      const keyId = this.configService.get<string>('APNS_KEY_ID');
      const teamId = this.configService.get<string>('APNS_TEAM_ID');
      const keyPath = this.configService.get<string>('APNS_PRIVATE_KEY_PATH');

      if (keyId && teamId && keyPath && keyPath.length > 10) {
        const fs = require('fs');
        if (fs.existsSync(keyPath)) {
          this.apnsProvider = new apn.Provider({
            token: {
              key: keyPath,
              keyId,
              teamId,
            },
            production: this.configService.get<boolean>('APNS_PRODUCTION', false),
          });
          this.isConfigured = true;
          this.logger.log('✅ APNS initialized successfully');
        }
      }
    } catch (error: any) {
      this.logger.warn(`⚠️  APNS initialization failed: ${error.message}`);
    }

    if (!this.fcmInitialized && !this.apnsProvider) {
      this.logger.warn('⚠️  No push notification provider configured - push features disabled');
    }
  }

  async send(payload: PushPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (payload.platform === DEVICE_PLATFORM.IOS) {
        return await this.sendViaAPNS(payload);
      } else {
        return await this.sendViaFCM(payload);
      }
    } catch (error: any) {
      this.logger.error(`Failed to send push notification: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  private async sendViaFCM(payload: PushPayload): Promise<{ success: boolean; messageId?: string }> {
    if (!this.fcmApp) {
      throw new Error('FCM not initialized');
    }

    const message: admin.messaging.Message = {
      token: payload.token,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data,
      android: {
        priority: 'high',
        notification: {
          sound: payload.sound || 'default',
          channelId: 'default',
        },
      },
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.imageUrl,
        },
      },
    };

    const messageId = await admin.messaging(this.fcmApp).send(message);
    this.logger.log(`Push notification sent via FCM: ${messageId}`);
    return { success: true, messageId };
  }

  private async sendViaAPNS(payload: PushPayload): Promise<{ success: boolean; messageId?: string }> {
    if (!this.apnsProvider) {
      throw new Error('APNS not initialized');
    }

    const notification = new apn.Notification({
      alert: {
        title: payload.title,
        body: payload.body,
      },
      topic: this.configService.get<string>('APNS_BUNDLE_ID'),
      badge: payload.badge,
      sound: payload.sound || 'default',
      payload: payload.data || {},
      mutableContent: 1,
    });

    const result = await this.apnsProvider.send(notification, payload.token);

    if (result.failed.length > 0) {
      const error = result.failed[0].response;
      throw new Error(`APNS error: ${error.reason}`);
    }

    this.logger.log(`Push notification sent via APNS to ${payload.token}`);
    return { success: true, messageId: result.sent[0].device };
  }

  async sendBatch(payloads: PushPayload[]): Promise<Array<{ success: boolean; messageId?: string; error?: string }>> {
    return Promise.all(payloads.map(payload => this.send(payload)));
  }
}
