import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as path from 'path';
import { createArrayCsvWriter } from 'csv-writer';
import { TaxReport, TaxReportStatus, CostBasisMethod } from '../entities/tax-report.entity';

interface Transaction {
  date: Date;
  type: string;
  asset: string;
  amount: number;
  price: number;
  fee: number;
  total: number;
}

interface TaxTransaction {
  date: Date;
  type: string;
  asset: string;
  amount: number;
  costBasis: number;
  proceeds: number;
  gainLoss: number;
  holdingPeriod?: number;
  isLongTerm?: boolean;
}

@Injectable()
export class TaxReportingService {
  private readonly logger = new Logger(TaxReportingService.name);

  constructor(
    @InjectRepository(TaxReport)
    private taxReportRepo: Repository<TaxReport>,
    private configService: ConfigService,
  ) {}

  /**
   * Generate tax report for a user
   */
  async generateTaxReport(
    userId: string,
    taxYear: number,
    costBasisMethod: CostBasisMethod = CostBasisMethod.FIFO,
  ): Promise<TaxReport> {
    this.logger.log(`Generating tax report for user ${userId}, year ${taxYear}`);

    // Check if report already exists
    let report = await this.taxReportRepo.findOne({
      where: { userId, taxYear },
    });

    if (!report) {
      report = this.taxReportRepo.create({
        userId,
        taxYear,
        costBasisMethod,
        status: TaxReportStatus.PENDING,
      });
      await this.taxReportRepo.save(report);
    }

    // Update status to generating
    report.status = TaxReportStatus.GENERATING;
    await this.taxReportRepo.save(report);

    try {
      // Fetch transactions from trading service
      const transactions = await this.fetchUserTransactions(userId, taxYear);

      // Calculate cost basis and gains/losses
      const taxTransactions = this.calculateTaxes(transactions, costBasisMethod);

      // Calculate totals
      const totals = this.calculateTotals(taxTransactions);

      // Update report
      report.totalTransactions = taxTransactions.length;
      report.transactions = taxTransactions as any;
      report.totalGains = totals.totalGains;
      report.totalLosses = totals.totalLosses;
      report.netCapitalGain = totals.netCapitalGain;
      report.shortTermGains = totals.shortTermGains;
      report.longTermGains = totals.longTermGains;
      report.totalIncome = totals.totalIncome;
      report.status = TaxReportStatus.COMPLETED;
      report.generatedAt = new Date();

      // Generate export files
      const csvUrl = await this.generateCSV(userId, taxYear, taxTransactions);
      const pdfUrl = await this.generatePDF(userId, taxYear, report);
      const form8949Url = await this.generateForm8949(userId, taxYear, taxTransactions);

      report.reportUrlCsv = csvUrl;
      report.reportUrlPdf = pdfUrl;
      report.form8949Url = form8949Url;

      return await this.taxReportRepo.save(report);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Tax report generation failed: ${message}`);
      report.status = TaxReportStatus.FAILED;
      await this.taxReportRepo.save(report);
      throw error;
    }
  }

  /**
   * Fetch user transactions for tax year
   */
  private async fetchUserTransactions(userId: string, taxYear: number): Promise<Transaction[]> {
    const tradingServiceUrl = this.configService.get('TRADING_SERVICE_URL');
    const startDate = new Date(taxYear, 0, 1);
    const endDate = new Date(taxYear, 11, 31, 23, 59, 59);

    try {
      const response = await axios.get(
        `${tradingServiceUrl}/api/v1/trades/history/${userId}`,
        {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        },
      );

      return response.data.transactions || [];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch transactions: ${message}`);
      return [];
    }
  }

  /**
   * Calculate cost basis and gains/losses
   */
  private calculateTaxes(
    transactions: Transaction[],
    method: CostBasisMethod,
  ): TaxTransaction[] {
    const taxTransactions: TaxTransaction[] = [];
    const inventory: Map<string, Array<{ amount: number; costBasis: number; date: Date }>> = new Map();

    for (const tx of transactions) {
      if (tx.type === 'buy' || tx.type === 'deposit') {
        // Add to inventory
        if (!inventory.has(tx.asset)) {
          inventory.set(tx.asset, []);
        }
        inventory.get(tx.asset)!.push({
          amount: tx.amount,
          costBasis: tx.price * tx.amount + tx.fee,
          date: tx.date,
        });
      } else if (tx.type === 'sell' || tx.type === 'withdrawal') {
        // Calculate gains/losses
        const lots = inventory.get(tx.asset) || [];
        let remainingAmount = tx.amount;
        let totalCostBasis = 0;

        // Apply cost basis method
        const selectedLots = this.selectLots(lots, remainingAmount, method);

        for (const lot of selectedLots) {
          const amountToSell = Math.min(lot.amount, remainingAmount);
          const costBasis = (lot.costBasis / lot.amount) * amountToSell;
          totalCostBasis += costBasis;
          remainingAmount -= amountToSell;

          // Calculate holding period
          const holdingPeriod = Math.floor(
            (tx.date.getTime() - lot.date.getTime()) / (1000 * 60 * 60 * 24),
          );
          const isLongTerm = holdingPeriod > 365;

          const proceeds = tx.price * amountToSell - tx.fee;
          const gainLoss = proceeds - costBasis;

          taxTransactions.push({
            date: tx.date,
            type: tx.type,
            asset: tx.asset,
            amount: amountToSell,
            costBasis,
            proceeds,
            gainLoss,
            holdingPeriod,
            isLongTerm,
          });

          // Update inventory
          lot.amount -= amountToSell;
        }

        // Remove depleted lots
        inventory.set(
          tx.asset,
          lots.filter((lot) => lot.amount > 0),
        );
      }
    }

    return taxTransactions;
  }

  /**
   * Select lots based on cost basis method
   */
  private selectLots(
    lots: Array<{ amount: number; costBasis: number; date: Date }>,
    _amount: number,
    method: CostBasisMethod,
  ): Array<{ amount: number; costBasis: number; date: Date }> {
    const sortedLots = [...lots];

    switch (method) {
      case CostBasisMethod.FIFO:
        // First In First Out - already in order
        break;
      case CostBasisMethod.LIFO:
        // Last In First Out
        sortedLots.reverse();
        break;
      case CostBasisMethod.HIFO:
        // Highest In First Out
        sortedLots.sort((a, b) => (b.costBasis / b.amount) - (a.costBasis / a.amount));
        break;
      case CostBasisMethod.AVERAGE:
        // Average cost - not implemented here, would need different logic
        break;
    }

    return sortedLots;
  }

  /**
   * Calculate totals
   */
  private calculateTotals(transactions: TaxTransaction[]): any {
    let totalGains = 0;
    let totalLosses = 0;
    let shortTermGains = 0;
    let longTermGains = 0;
    let totalIncome = 0;

    for (const tx of transactions) {
      if (tx.gainLoss > 0) {
        totalGains += tx.gainLoss;
        if (tx.isLongTerm) {
          longTermGains += tx.gainLoss;
        } else {
          shortTermGains += tx.gainLoss;
        }
      } else {
        totalLosses += Math.abs(tx.gainLoss);
      }

      // Income from staking, rewards, etc. would be added here
    }

    const netCapitalGain = totalGains - totalLosses;

    return {
      totalGains,
      totalLosses,
      netCapitalGain,
      shortTermGains,
      longTermGains,
      totalIncome,
    };
  }

  /**
   * Generate CSV export
   */
  private async generateCSV(
    userId: string,
    taxYear: number,
    transactions: TaxTransaction[],
  ): Promise<string> {
    const filename = `tax_report_${userId}_${taxYear}.csv`;
    const filepath = path.join('/tmp', filename);

    const csvWriter = createArrayCsvWriter({
      path: filepath,
      header: [
        'Date',
        'Type',
        'Asset',
        'Amount',
        'Cost Basis',
        'Proceeds',
        'Gain/Loss',
        'Holding Period (days)',
        'Long Term',
      ],
    });

    const records = transactions.map((tx) => [
      tx.date.toISOString().split('T')[0],
      tx.type,
      tx.asset,
      tx.amount.toFixed(8),
      tx.costBasis.toFixed(2),
      tx.proceeds.toFixed(2),
      tx.gainLoss.toFixed(2),
      tx.holdingPeriod?.toString() || '',
      tx.isLongTerm ? 'Yes' : 'No',
    ]);

    await csvWriter.writeRecords(records);

    // In production, upload to S3 and return URL
    return `https://reports.example.com/${filename}`;
  }

  /**
   * Generate PDF export
   */
  private async generatePDF(
    userId: string,
    taxYear: number,
    _report: TaxReport,
  ): Promise<string> {
    // In production, use a PDF library like PDFKit or Puppeteer
    const filename = `tax_report_${userId}_${taxYear}.pdf`;
    
    // Placeholder - would generate actual PDF
    return `https://reports.example.com/${filename}`;
  }

  /**
   * Generate IRS Form 8949
   */
  private async generateForm8949(
    userId: string,
    taxYear: number,
    _transactions: TaxTransaction[],
  ): Promise<string> {
    const filename = `form_8949_${userId}_${taxYear}.pdf`;
    
    // In production, generate actual Form 8949 PDF
    return `https://reports.example.com/${filename}`;
  }

  /**
   * Export to CoinTracker
   */
  async exportToCoinTracker(userId: string, taxYear: number): Promise<void> {
    const report = await this.taxReportRepo.findOne({ where: { userId, taxYear } });

    if (!report) {
      throw new NotFoundException('Tax report not found');
    }

    // Export to CoinTracker API
    // API integration would go here
    
    report.exportedToCointracker = true;
    await this.taxReportRepo.save(report);
  }

  /**
   * Export to Koinly
   */
  async exportToKoinly(userId: string, taxYear: number): Promise<void> {
    const report = await this.taxReportRepo.findOne({ where: { userId, taxYear } });

    if (!report) {
      throw new NotFoundException('Tax report not found');
    }

    // Export to Koinly API
    // API integration would go here
    
    report.exportedToKoinly = true;
    await this.taxReportRepo.save(report);
  }

  /**
   * Get tax report
   */
  async getTaxReport(userId: string, taxYear: number): Promise<TaxReport> {
    const report = await this.taxReportRepo.findOne({ where: { userId, taxYear } });
    if (!report) {
      throw new NotFoundException('Tax report not found');
    }
    return report;
  }

  /**
   * Get all tax reports for user
   */
  async getUserTaxReports(userId: string): Promise<TaxReport[]> {
    return await this.taxReportRepo.find({
      where: { userId },
      order: { taxYear: 'DESC' },
    });
  }
}
