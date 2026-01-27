import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NftTransaction, TransactionType } from '../entities/nft-transaction.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(NftTransaction)
    private transactionsRepository: Repository<NftTransaction>,
  ) {}

  async getPriceHistory(nftId: string) {
    const transactions = await this.transactionsRepository.find({
      where: { nftId, transactionType: TransactionType.SALE },
      order: { createdAt: 'ASC' },
    });

    return transactions.map(tx => ({
      price: tx.price,
      timestamp: tx.createdAt,
      from: tx.fromAddress,
      to: tx.toAddress,
    }));
  }

  async getCollectionAnalytics(collectionId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const sales = await this.transactionsRepository
      .createQueryBuilder('tx')
      .where('tx.collectionId = :collectionId', { collectionId })
      .andWhere('tx.transactionType = :type', { type: 'SALE' })
      .andWhere('tx.createdAt >= :since', { since })
      .getMany();

    const totalVolume = sales.reduce((sum, tx) => sum + parseFloat(tx.price || '0'), 0);
    const avgPrice = sales.length > 0 ? totalVolume / sales.length : 0;

    return {
      salesCount: sales.length,
      totalVolume: totalVolume.toString(),
      avgPrice: avgPrice.toString(),
      period: `${days} days`,
    };
  }

  async getMarketplaceStats() {
    const totalSales = await this.transactionsRepository.count({
      where: { transactionType: TransactionType.SALE },
    });

    const volumeResult = await this.transactionsRepository
      .createQueryBuilder('tx')
      .select('SUM(CAST(tx.price AS DECIMAL))', 'total')
      .where('tx.transactionType = :type', { type: 'SALE' })
      .getRawOne();

    return {
      totalSales,
      totalVolume: volumeResult.total || '0',
    };
  }
}
