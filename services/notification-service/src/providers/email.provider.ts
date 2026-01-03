import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import * as AWS from 'aws-sdk';
import * as nodemailer from 'nodemailer';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

@Injectable()
export class EmailProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private sendGridClient: typeof sgMail;
  private sesClient: AWS.SES;
  private smtpTransporter: nodemailer.Transporter;
  private provider: 'sendgrid' | 'ses' | 'smtp' | null;
  private isConfigured: boolean = false;

  constructor(private readonly configService: ConfigService) {
    const sendgridKey = this.configService.get<string>('SENDGRID_API_KEY');
    const awsRegion = this.configService.get<string>('AWS_REGION');
    const smtpHost = this.configService.get<string>('SMTP_HOST');

    // Try SendGrid first
    if (sendgridKey && sendgridKey.startsWith('SG.') && sendgridKey.length > 30) {
      try {
        sgMail.setApiKey(sendgridKey);
        this.provider = 'sendgrid';
        this.isConfigured = true;
        this.logger.log('✅ Email provider initialized with SendGrid');
      } catch (error:any) {
        this.logger.warn(`SendGrid initialization failed: ${error.message}`);
      }
    }
    // Try AWS SES
    else if (awsRegion && awsRegion.length > 2) {
      try {
        this.sesClient = new AWS.SES({
          region: awsRegion,
          accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
          secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
        });
        this.provider = 'ses';
        this.isConfigured = true;
        this.logger.log('✅ Email provider initialized with AWS SES');
      } catch (error:any) {
        this.logger.warn(`AWS SES initialization failed: ${error.message}`);
      }
    }
    // Try SMTP
    else if (smtpHost && smtpHost.length > 5 && smtpHost !== 'smtp.example.com') {
      try {
        this.smtpTransporter = nodemailer.createTransport({
          host: smtpHost,
          port: this.configService.get<number>('SMTP_PORT', 587),
          secure: this.configService.get<boolean>('SMTP_SECURE', false),
          auth: {
            user: this.configService.get<string>('SMTP_USER'),
            pass: this.configService.get<string>('SMTP_PASSWORD'),
          },
        });
        this.provider = 'smtp';
        this.isConfigured = true;
        this.logger.log('✅ Email provider initialized with SMTP');
      } catch (error:any) {
        this.logger.warn(`SMTP initialization failed: ${error.message}`);
      }
    }
    // No provider configured
    else {
      this.provider = null;
      this.isConfigured = false;
      this.logger.warn('⚠️  No email provider configured - email features disabled');
    }
  }

  async send(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured) {
      this.logger.warn('Email provider not configured - skipping email send');
      return { success: false, error: 'No email provider configured' };
    }

    try {
      switch (this.provider) {
        case 'sendgrid':
          return await this.sendViaSendGrid(payload);
        case 'ses':
          return await this.sendViaSES(payload);
        case 'smtp':
          return await this.sendViaSMTP(payload);
        default:
          return { success: false, error: 'No email provider configured' };
      }
    } catch (error:any) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  private async sendViaSendGrid(payload: EmailPayload): Promise<{ success: boolean; messageId?: string }> {
    const msg = {
      to: payload.to,
      from: payload.from || this.configService.get<string>('SENDGRID_FROM_EMAIL'),
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      replyTo: payload.replyTo,
      attachments: payload.attachments?.map(att => ({
        filename: att.filename,
        content: att.content.toString('base64'),
        type: att.contentType,
        disposition: 'attachment',
      })),
    };

    const [response] = await this.sendGridClient.send(msg);
    this.logger.log(`Email sent via SendGrid to ${payload.to}`);
    return { success: true, messageId: response.headers['x-message-id'] as string };
  }

  private async sendViaSES(payload: EmailPayload): Promise<{ success: boolean; messageId?: string }> {
    const params: AWS.SES.SendEmailRequest = {
      Source: payload.from || this.configService.get<string>('AWS_SES_FROM_EMAIL'),
      Destination: {
        ToAddresses: [payload.to],
      },
      Message: {
        Subject: {
          Data: payload.subject,
        },
        Body: {
          Html: {
            Data: payload.html,
          },
          Text: {
            Data: payload.text || '',
          },
        },
      },
    };

    const result = await this.sesClient.sendEmail(params).promise();
    this.logger.log(`Email sent via SES to ${payload.to}`);
    return { success: true, messageId: result.MessageId };
  }

  private async sendViaSMTP(payload: EmailPayload): Promise<{ success: boolean; messageId?: string }> {
    const info = await this.smtpTransporter.sendMail({
      from: payload.from || this.configService.get<string>('SMTP_USER'),
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      replyTo: payload.replyTo,
      attachments: payload.attachments,
    });

    this.logger.log(`Email sent via SMTP to ${payload.to}`);
    return { success: true, messageId: info.messageId };
  }

  async verifyConnection(): Promise<boolean> {
    try {
      if (this.provider === 'smtp') {
        await this.smtpTransporter.verify();
      }
      return true;
    } catch (error:any) {
      this.logger.error(`Email provider verification failed: ${error.message}`);
      return false;
    }
  }
}
