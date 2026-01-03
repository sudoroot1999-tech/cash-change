import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';

export interface TelegramPayload {
  chatId: string;
  message: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableWebPagePreview?: boolean;
  disableNotification?: boolean;
}

@Injectable()
export class TelegramProvider {
  private readonly logger = new Logger(TelegramProvider.name);
  private bot: Telegraf;

  constructor(private readonly configService: ConfigService) {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (botToken) {
      this.bot = new Telegraf(botToken);
      this.logger.log('Telegram bot initialized');
    } else {
      this.logger.warn('Telegram bot token not configured');
    }
  }

  async send(payload: TelegramPayload): Promise<{ success: boolean; messageId?: number; error?: string }> {
    if (!this.bot) {
      return { success: false, error: 'Telegram bot not initialized' };
    }

    try {
      const message = await this.bot.telegram.sendMessage(payload.chatId, payload.message, {
        parse_mode: payload.parseMode as any,
        disable_notification: payload.disableNotification,
      });

      this.logger.log(`Telegram message sent to chat ${payload.chatId}`);
      return { success: true, messageId: message.message_id };
    } catch (error:any) {
      this.logger.error(`Failed to send Telegram message: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  async sendWithButtons(
    chatId: string,
    message: string,
    buttons: Array<{ text: string; url?: string; callback_data?: string }>,
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    if (!this.bot) {
      return { success: false, error: 'Telegram bot not initialized' };
    }

    try {
      const keyboard = {
        inline_keyboard: [
          buttons.map(btn => ({
            text: btn.text,
            url: btn.url,
            callback_data: btn.callback_data,
          })),
        ],
      };

      const result = await this.bot.telegram.sendMessage(chatId, message, {
        reply_markup: keyboard,
      });

      this.logger.log(`Telegram message with buttons sent to chat ${chatId}`);
      return { success: true, messageId: result.message_id };
    } catch (error:any) {
      this.logger.error(`Failed to send Telegram message with buttons: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  async sendPhoto(
    chatId: string,
    photoUrl: string,
    caption?: string,
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    if (!this.bot) {
      return { success: false, error: 'Telegram bot not initialized' };
    }

    try {
      const message = await this.bot.telegram.sendPhoto(chatId, photoUrl, {
        caption: caption,
      });

      this.logger.log(`Telegram photo sent to chat ${chatId}`);
      return { success: true, messageId: message.message_id };
    } catch (error:any) {
      this.logger.error(`Failed to send Telegram photo: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }
}
