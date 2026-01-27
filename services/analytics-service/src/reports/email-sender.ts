import nodemailer from 'nodemailer';
import fs from 'fs';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

export class EmailSender {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASSWORD || '',
      },
    });
  }

  async sendReport(
    recipients: string[],
    reportType: string,
    filePath: string,
    period: { start: Date; end: Date }
  ): Promise<void> {
    try {
      const filename = filePath.split('/').pop();
      const attachment = fs.readFileSync(filePath);

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'analytics@example.com',
        to: recipients.join(', '),
        subject: `${this.capitalizeFirst(reportType)} Report - ${period.start.toISOString().split('T')[0]} to ${period.end.toISOString().split('T')[0]}`,
        html: this.generateEmailHTML(reportType, period),
        attachments: [
          {
            filename: filename,
            content: attachment,
          },
        ],
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Report email sent to ${recipients.join(', ')}`);
    } catch (error) {
      logger.error('Failed to send report email', error);
      throw error;
    }
  }

  private generateEmailHTML(reportType: string, period: { start: Date; end: Date }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${this.capitalizeFirst(reportType)} Report</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Please find attached your ${reportType} report for the period:</p>
          <p><strong>From:</strong> ${period.start.toISOString().split('T')[0]}<br>
          <strong>To:</strong> ${period.end.toISOString().split('T')[0]}</p>
          <p>This report contains comprehensive analytics and insights for your review.</p>
          <p>If you have any questions or need additional information, please don't hesitate to contact us.</p>
          <p>Best regards,<br>Analytics Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </body>
      </html>
    `;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed', error);
      return false;
    }
  }
}
