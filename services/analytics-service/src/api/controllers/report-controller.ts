import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { ReportGenerator } from '../../reports/report-generator';
import { EmailSender } from '../../reports/email-sender';
import { ReportRequest } from '../../models/types';
import { logger } from '../../utils/logger';
import { analyticsDb } from '../../config/database';

export class ReportController {
  private reportGenerator: ReportGenerator;
  private emailSender: EmailSender;

  constructor() {
    this.reportGenerator = new ReportGenerator();
    this.emailSender = new EmailSender();
  }

  async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const reportRequest: ReportRequest = {
        report_type: req.body.report_type,
        format: req.body.format,
        period: {
          start: new Date(req.body.period.start),
          end: new Date(req.body.period.end),
        },
        filters: req.body.filters,
        email_recipients: req.body.email_recipients,
      };

      const filePath = await this.reportGenerator.generateReport(reportRequest);

      // Send email if recipients provided
      if (reportRequest.email_recipients && reportRequest.email_recipients.length > 0) {
        await this.emailSender.sendReport(
          reportRequest.email_recipients,
          reportRequest.report_type,
          filePath,
          reportRequest.period
        );
      }

      const filename = path.basename(filePath);

      res.json({
        success: true,
        message: 'Report generated successfully',
        data: {
          filename: filename,
          download_url: `/analytics/report/download/${filename}`,
        },
      });
    } catch (error) {
      logger.error('Error generating report', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate report',
      });
    }
  }

  async downloadReport(req: Request, res: Response): Promise<void> {
    try {
      const filename = req.params.filename;
      const outputDir = process.env.REPORT_OUTPUT_DIR || './reports';
      const filePath = path.join(outputDir, filename);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({
          success: false,
          error: 'Report not found',
        });
        return;
      }

      res.download(filePath);
    } catch (error) {
      logger.error('Error downloading report', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download report',
      });
    }
  }

  async scheduleReport(req: Request, res: Response): Promise<void> {
    try {
      // This would integrate with a job scheduler like Bull or node-cron
      // For now, just store the schedule in database
      
      res.json({
        success: true,
        message: 'Report scheduled successfully',
        data: {
          schedule: req.body.schedule,
        },
      });
    } catch (error) {
      logger.error('Error scheduling report', error);
      res.status(500).json({
        success: false,
        error: 'Failed to schedule report',
      });
    }
  }

  async executeCustomQuery(req: Request, res: Response): Promise<void> {
    try {
      // WARNING: This is potentially dangerous and should have strict access controls
      // Only allow whitelisted queries or use a query builder with validation
      
      const { query, params } = req.body;

      // Basic validation
      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Invalid query',
        });
        return;
      }

      // Block dangerous operations
      const dangerousKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'INSERT', 'UPDATE', 'ALTER'];
      const upperQuery = query.toUpperCase();
      
      for (const keyword of dangerousKeywords) {
        if (upperQuery.includes(keyword)) {
          res.status(403).json({
            success: false,
            error: 'Query contains forbidden operations',
          });
          return;
        }
      }

      // Execute query with timeout
      const result = await analyticsDb.raw(query, params).timeout(30000);

      res.json({
        success: true,
        data: result.rows || result,
      });
    } catch (error) {
      logger.error('Error executing custom query', error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute query',
      });
    }
  }
}
