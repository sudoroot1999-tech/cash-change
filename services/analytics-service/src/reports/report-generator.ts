import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { ReportRequest } from '../models/types';
import { DashboardService } from '../services/dashboard-service';
import { TradingAnalyticsService } from '../services/trading-analytics-service';
import { UserAnalyticsService } from '../services/user-analytics-service';
import { FinancialService } from '../services/financial-service';
import { RiskService } from '../services/risk-service';
import { MarketingService } from '../services/marketing-service';

export class ReportGenerator {
  private dashboardService: DashboardService;
  private tradingService: TradingAnalyticsService;
  private userService: UserAnalyticsService;
  private financialService: FinancialService;
  private riskService: RiskService;
  private marketingService: MarketingService;
  private outputDir: string;

  constructor() {
    this.dashboardService = new DashboardService();
    this.tradingService = new TradingAnalyticsService();
    this.userService = new UserAnalyticsService();
    this.financialService = new FinancialService();
    this.riskService = new RiskService();
    this.marketingService = new MarketingService();
    this.outputDir = process.env.REPORT_OUTPUT_DIR || './reports';

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async generateReport(request: ReportRequest): Promise<string> {
    try {
      logger.info('Generating report', { type: request.report_type, format: request.format });

      // Fetch data based on report type
      let data: any;
      switch (request.report_type) {
        case 'executive':
          data = await this.dashboardService.getExecutiveDashboard(
            request.period.start,
            request.period.end
          );
          break;
        case 'trading':
          data = await this.tradingService.getTradingAnalytics(
            request.period.start,
            request.period.end
          );
          break;
        case 'user':
          data = await this.userService.getUserAnalytics(request.period.start, request.period.end);
          break;
        case 'financial':
          data = await this.financialService.getFinancialReport(
            request.period.start,
            request.period.end
          );
          break;
        case 'risk':
          data = await this.riskService.getRiskReport(request.period.start, request.period.end);
          break;
        case 'marketing':
          data = await this.marketingService.getMarketingReport(
            request.period.start,
            request.period.end
          );
          break;
        default:
          throw new Error(`Unknown report type: ${request.report_type}`);
      }

      // Generate report in requested format
      let filePath: string;
      switch (request.format) {
        case 'pdf':
          filePath = await this.generatePDF(request.report_type, data);
          break;
        case 'excel':
          filePath = await this.generateExcel(request.report_type, data);
          break;
        case 'csv':
          filePath = await this.generateCSV(request.report_type, data);
          break;
        case 'json':
          filePath = await this.generateJSON(request.report_type, data);
          break;
        default:
          throw new Error(`Unknown format: ${request.format}`);
      }

      logger.info(`Report generated: ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error('Report generation failed', error);
      throw error;
    }
  }

  private async generatePDF(reportType: string, data: any): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const filename = `${reportType}_report_${Date.now()}.pdf`;
        const filePath = path.join(this.outputDir, filename);
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Header
        doc.fontSize(24).text(`${this.capitalizeFirst(reportType)} Report`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
        doc.moveDown(2);

        // Content based on report type
        switch (reportType) {
          case 'executive':
            this.addExecutivePDFContent(doc, data);
            break;
          case 'trading':
            this.addTradingPDFContent(doc, data);
            break;
          case 'financial':
            this.addFinancialPDFContent(doc, data);
            break;
          case 'risk':
            this.addRiskPDFContent(doc, data);
            break;
          default:
            doc.fontSize(14).text(JSON.stringify(data, null, 2));
        }

        doc.end();

        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  private addExecutivePDFContent(doc: PDFKit.PDFDocument, data: any): void {
    doc.fontSize(16).text('Revenue Overview', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Total Revenue: $${data.revenue.total.toFixed(2)}`);
    doc.moveDown();

    doc.fontSize(16).text('User Metrics', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Total Users: ${data.users.total}`);
    doc.text(`New Users: ${data.users.new}`);
    doc.text(`Active Users: ${data.users.active}`);
    doc.text(`Growth Rate: ${data.users.growth_rate.toFixed(2)}%`);
    doc.moveDown();

    doc.fontSize(16).text('Trading Metrics', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Total Volume: ${data.trading.volume.toFixed(2)}`);
    doc.text(`Total Trades: ${data.trading.trades}`);
    doc.text(`Avg Trade Size: ${data.trading.avg_trade_size.toFixed(2)}`);
    doc.moveDown();

    doc.fontSize(16).text('Key Metrics', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Revenue per User: $${data.key_metrics.revenue_per_user.toFixed(2)}`);
    doc.text(`Avg LTV: $${data.key_metrics.avg_ltv.toFixed(2)}`);
    doc.text(`Churn Rate: ${data.key_metrics.churn_rate.toFixed(2)}%`);
    doc.text(`Retention Rate: ${data.key_metrics.retention_rate.toFixed(2)}%`);
  }

  private addTradingPDFContent(doc: PDFKit.PDFDocument, data: any): void {
    doc.fontSize(16).text('Volume by Trading Pair', { underline: true });
    doc.moveDown();

    data.volume_by_pair.slice(0, 10).forEach((pair: any) => {
      doc.fontSize(12).text(`${pair.pair}: ${pair.volume.toFixed(2)} (${pair.trades} trades)`);
    });

    doc.moveDown(2);
    doc.fontSize(16).text('Liquidity Metrics', { underline: true });
    doc.moveDown();

    data.liquidity.slice(0, 5).forEach((liq: any) => {
      doc
        .fontSize(12)
        .text(
          `${liq.pair}: Bid: ${liq.bid_volume.toFixed(2)}, Ask: ${liq.ask_volume.toFixed(2)}, Spread: ${liq.spread.toFixed(4)}`
        );
    });
  }

  private addFinancialPDFContent(doc: PDFKit.PDFDocument, data: any): void {
    doc.fontSize(16).text('Profit & Loss Statement', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Total Revenue: $${data.profit_and_loss.total_revenue.toFixed(2)}`);
    doc.text(`Total Expenses: $${data.profit_and_loss.total_expenses.toFixed(2)}`);
    doc.text(`Net Profit: $${data.profit_and_loss.net_profit.toFixed(2)}`);
    doc.text(`Profit Margin: ${data.profit_and_loss.profit_margin.toFixed(2)}%`);
    doc.moveDown();

    if (data.balance_sheet) {
      doc.fontSize(16).text('Balance Sheet', { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(`Total Assets: $${data.balance_sheet.total_assets.toFixed(2)}`);
      doc.text(`Total Liabilities: $${data.balance_sheet.total_liabilities.toFixed(2)}`);
      doc.text(`Equity: $${data.balance_sheet.equity.toFixed(2)}`);
      doc.text(`Reserve Ratio: ${(data.balance_sheet.reserve_ratio * 100).toFixed(2)}%`);
    }
  }

  private addRiskPDFContent(doc: PDFKit.PDFDocument, data: any): void {
    doc.fontSize(16).text('Risk Report', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Total Exposure: $${data.exposure.total.toFixed(2)}`);
    doc.text(`Risk Score: ${data.risk_score}/100`);
    doc.moveDown();

    doc.fontSize(14).text('Liquidation Events', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Total Events: ${data.liquidations.total_events}`);
    doc.text(`Total Loss: $${data.liquidations.total_loss.toFixed(2)}`);
    doc.moveDown();

    doc.fontSize(14).text('Fraud Alerts', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Total Alerts: ${data.fraud.total_alerts}`);
    doc.text(`Open Alerts: ${data.fraud.open_alerts}`);
    doc.text(
      `Critical: ${data.fraud.by_severity.critical}, High: ${data.fraud.by_severity.high}`
    );
  }

  private async generateExcel(reportType: string, data: any): Promise<string> {
    const filename = `${reportType}_report_${Date.now()}.xlsx`;
    const filePath = path.join(this.outputDir, filename);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Analytics Service';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(this.capitalizeFirst(reportType));

    // Add header
    worksheet.addRow([`${this.capitalizeFirst(reportType)} Report`]);
    worksheet.addRow([`Generated: ${new Date().toISOString()}`]);
    worksheet.addRow([]);

    // Add content based on report type
    switch (reportType) {
      case 'executive':
        this.addExecutiveExcelContent(worksheet, data);
        break;
      case 'trading':
        this.addTradingExcelContent(worksheet, data);
        break;
      case 'financial':
        this.addFinancialExcelContent(worksheet, data);
        break;
      default:
        worksheet.addRow(['Data']);
        worksheet.addRow([JSON.stringify(data)]);
    }

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  private addExecutiveExcelContent(worksheet: ExcelJS.Worksheet, data: any): void {
    worksheet.addRow(['Revenue Overview']);
    worksheet.addRow(['Total Revenue', data.revenue.total]);
    worksheet.addRow([]);

    worksheet.addRow(['User Metrics']);
    worksheet.addRow(['Total Users', data.users.total]);
    worksheet.addRow(['New Users', data.users.new]);
    worksheet.addRow(['Active Users', data.users.active]);
    worksheet.addRow(['Growth Rate (%)', data.users.growth_rate]);
    worksheet.addRow([]);

    worksheet.addRow(['Trading Metrics']);
    worksheet.addRow(['Total Volume', data.trading.volume]);
    worksheet.addRow(['Total Trades', data.trading.trades]);
    worksheet.addRow(['Avg Trade Size', data.trading.avg_trade_size]);
  }

  private addTradingExcelContent(worksheet: ExcelJS.Worksheet, data: any): void {
    worksheet.addRow(['Volume by Trading Pair']);
    worksheet.addRow(['Pair', 'Volume', 'Trades', 'Unique Users']);

    data.volume_by_pair.forEach((pair: any) => {
      worksheet.addRow([pair.pair, pair.volume, pair.trades, pair.unique_users]);
    });

    worksheet.addRow([]);
    worksheet.addRow(['Liquidity Metrics']);
    worksheet.addRow(['Pair', 'Bid Volume', 'Ask Volume', 'Spread']);

    data.liquidity.forEach((liq: any) => {
      worksheet.addRow([liq.pair, liq.bid_volume, liq.ask_volume, liq.spread]);
    });
  }

  private addFinancialExcelContent(worksheet: ExcelJS.Worksheet, data: any): void {
    worksheet.addRow(['Profit & Loss']);
    worksheet.addRow(['Total Revenue', data.profit_and_loss.total_revenue]);
    worksheet.addRow(['Total Expenses', data.profit_and_loss.total_expenses]);
    worksheet.addRow(['Net Profit', data.profit_and_loss.net_profit]);
    worksheet.addRow(['Profit Margin (%)', data.profit_and_loss.profit_margin]);
    worksheet.addRow([]);

    if (data.balance_sheet) {
      worksheet.addRow(['Balance Sheet']);
      worksheet.addRow(['Total Assets', data.balance_sheet.total_assets]);
      worksheet.addRow(['Total Liabilities', data.balance_sheet.total_liabilities]);
      worksheet.addRow(['Equity', data.balance_sheet.equity]);
      worksheet.addRow(['Reserve Ratio', data.balance_sheet.reserve_ratio]);
    }
  }

  private async generateCSV(reportType: string, data: any): Promise<string> {
    const filename = `${reportType}_report_${Date.now()}.csv`;
    const filePath = path.join(this.outputDir, filename);

    let csvContent = `${this.capitalizeFirst(reportType)} Report\n`;
    csvContent += `Generated: ${new Date().toISOString()}\n\n`;

    // Convert data to CSV format
    csvContent += this.dataToCSV(data);

    fs.writeFileSync(filePath, csvContent);
    return filePath;
  }

  private dataToCSV(data: any, prefix: string = ''): string {
    let csv = '';

    for (const [key, value] of Object.entries(data)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'object') {
          // Array of objects - create table
          const headers = Object.keys(value[0]);
          csv += `\n${fullKey}\n`;
          csv += headers.join(',') + '\n';
          value.forEach((item) => {
            csv += headers.map((h) => item[h]).join(',') + '\n';
          });
        } else {
          csv += `${fullKey},${value.join(',')}\n`;
        }
      } else if (typeof value === 'object' && value !== null) {
        csv += this.dataToCSV(value, fullKey);
      } else {
        csv += `${fullKey},${value}\n`;
      }
    }

    return csv;
  }

  private async generateJSON(reportType: string, data: any): Promise<string> {
    const filename = `${reportType}_report_${Date.now()}.json`;
    const filePath = path.join(this.outputDir, filename);

    const jsonData = {
      report_type: reportType,
      generated_at: new Date().toISOString(),
      data: data,
    };

    fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
    return filePath;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
