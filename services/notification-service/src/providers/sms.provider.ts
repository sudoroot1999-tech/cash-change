import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Twilio from 'twilio';

export interface SmsPayload {
  to: string;
  message: string;
  from?: string;
}

@Injectable()
export class SmsProvider {
  private readonly logger = new Logger(SmsProvider.name);
  private readonly twilioClient: Twilio.Twilio;
  private readonly kavenegarApiKey: string;
  private readonly provider: 'twilio' | 'kavenegar';

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = this.configService.get('TWILIO_PHONE_NUMBER');
    const kavenegarKey = this.configService.get<string>('KAVENEGAR_API_KEY');

    if (accountSid && authToken && twilioPhone && accountSid.startsWith('AC')) {
      this.provider = 'twilio';
      this.twilioClient = Twilio(accountSid, authToken);
      this.logger.log('SMS provider initialized with Twilio');
    } else if (kavenegarKey) {
      this.provider = 'kavenegar';
      this.kavenegarApiKey = kavenegarKey;
      this.logger.log('SMS provider initialized with Kavenegar');
    } else {
      this.logger.warn('⚠️  Twilio credentials not configured - SMS sending will be disabled');
    }
  }

  async send(payload: SmsPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (this.provider === 'twilio') {
        return await this.sendViaTwilio(payload);
      } else {
        return await this.sendViaKavenegar(payload);
      }
    } catch (error:any) {
      this.logger.error(`Failed to send SMS: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  private async sendViaTwilio(payload: SmsPayload): Promise<{ success: boolean; messageId?: string }> {
    const message = await this.twilioClient.messages.create({
      body: payload.message,
      from: payload.from || this.configService.get<string>('TWILIO_PHONE_NUMBER'),
      to: payload.to,
    });

    this.logger.log(`SMS sent via Twilio to ${payload.to}, SID: ${message.sid}`);
    return { success: true, messageId: message.sid };
  }

  private async sendViaKavenegar(payload: SmsPayload): Promise<{ success: boolean; messageId?: string }> {
    const Kavenegar = require('kavenegar');
    const api = Kavenegar.KavenegarApi({
      apikey: this.kavenegarApiKey,
    });

    return new Promise((resolve, reject) => {
      api.Send(
        {
          message: payload.message,
          sender: payload.from || this.configService.get<string>('KAVENEGAR_SENDER'),
          receptor: payload.to,
        },
        (response: any, status: number) => {
          if (status === 200) {
            this.logger.log(`SMS sent via Kavenegar to ${payload.to}`);
            resolve({ success: true, messageId: response[0].messageid.toString() });
          } else {
            reject(new Error(`Kavenegar error: ${JSON.stringify(response)}`));
          }
        },
      );
    });
  }

  isIranianNumber(phoneNumber: string): boolean {
    return phoneNumber.startsWith('+98') || phoneNumber.startsWith('98') || phoneNumber.startsWith('09');
  }

  async sendSmart(payload: SmsPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Auto-detect provider based on phone number
    if (this.isIranianNumber(payload.to) && this.provider === 'kavenegar') {
      return this.sendViaKavenegar(payload);
    }
    return this.send(payload);
  }
}
