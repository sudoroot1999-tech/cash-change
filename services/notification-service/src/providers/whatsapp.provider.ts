import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface WhatsAppPayload {
  to: string;
  message: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document';
}

@Injectable()
export class WhatsAppProvider {
  private readonly logger = new Logger(WhatsAppProvider.name);
  private readonly client: AxiosInstance;
  private readonly phoneNumberId: string;

  constructor(private readonly configService: ConfigService) {
    const apiUrl = this.configService.get<string>('WHATSAPP_API_URL');
    const apiToken = this.configService.get<string>('WHATSAPP_API_TOKEN');
    this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');

    if (apiUrl && apiToken) {
      this.client = axios.create({
        baseURL: apiUrl,
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.log('WhatsApp Business API initialized');
    } else {
      this.logger.warn('WhatsApp Business API not configured');
    }
  }

  async send(payload: WhatsAppPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'WhatsApp API not initialized' };
    }

    try {
      const data: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: payload.to,
        type: 'text',
        text: {
          preview_url: true,
          body: payload.message,
        },
      };

      if (payload.mediaUrl) {
        data.type = payload.mediaType || 'image';
        data[data.type] = {
          link: payload.mediaUrl,
        };
        delete data.text;
      }

      const response = await this.client.post(
        `/${this.phoneNumberId}/messages`,
        data,
      );

      this.logger.log(`WhatsApp message sent to ${payload.to}`);
      return { success: true, messageId: response.data.messages[0].id };
    } catch (error:any) {
      this.logger.error(`Failed to send WhatsApp message: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string = 'en',
    components?: any[],
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'WhatsApp API not initialized' };
    }

    try {
      const data = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
          components: components || [],
        },
      };

      const response = await this.client.post(
        `/${this.phoneNumberId}/messages`,
        data,
      );

      this.logger.log(`WhatsApp template sent to ${to}`);
      return { success: true, messageId: response.data.messages[0].id };
    } catch (error:any) {
      this.logger.error(`Failed to send WhatsApp template: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }
}
