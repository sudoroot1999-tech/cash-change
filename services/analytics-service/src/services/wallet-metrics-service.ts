import { Pool } from 'pg';
import { RedisClientType } from 'redis';
import { logger } from '../utils/logger';

interface WalletMetrics {
  totalDepositsCount: number;
  totalDepositsVolume: number;
  totalWithdrawalsCount: number;
  totalWithdrawalsVolume: number;
  netDepositFlow: number;
  avgDepositSize: number;
  avgWithdrawalSize: number;
  assetsUnderManagement: number;
  uniqueDepositors: number;
  uniqueWithdrawers: number;
}

interface AssetDistribution {
  asset: string;
  balance: number;
  percentage: number;
  userCount: number;
  avgBalance: number;
}

interface DepositWithdrawalTrend {
  date: string;
  deposits: number;
  withdrawals: number;
  netFlow: number;
}

interface WalletBalanceDistribution {
  range: string;
  userCount: number;
  totalBalance: number;
  percentage: number;
}

export class WalletMetricsService {
  private db: Pool;
  private cache: RedisClientType;
  private logger: any;
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(db: Pool, cache: RedisClientType) {
    this.db = db;
    this.cache = cache;
    this.logger = logger;
  }

  /**
   * Get comprehensive wallet metrics
   */
  async getWalletMetrics(startDate: Date, endDate: Date, asset?: string): Promise<WalletMetrics> {
    const cacheKey = `wallet_metrics:${startDate.toISOString()}:${endDate.toISOString()}:${asset || 'all'}`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const assetCondition = asset ? 'AND asset = $3' : '';
      const params = asset ? [startDate, endDate, asset] : [startDate, endDate];

      const query = `
        SELECT 
          SUM(total_deposits_count) as total_deposits_count,
          SUM(total_deposits_volume) as total_deposits_volume,
          SUM(total_withdrawals_count) as total_withdrawals_count,
          SUM(total_withdrawals_volume) as total_withdrawals_volume,
          SUM(net_deposit_flow) as net_deposit_flow,
          AVG(avg_deposit_size) as avg_deposit_size,
          AVG(avg_withdrawal_size) as avg_withdrawal_size,
          AVG(assets_under_management) as assets_under_management,
          AVG(unique_depositors) as unique_depositors,
          AVG(unique_withdrawers) as unique_withdrawers
        FROM metrics_daily_wallet
        WHERE time >= $1 AND time <= $2 ${assetCondition}
      `;

      const result = await this.db.query(query, params);
      const row = result.rows[0];

      const metrics: WalletMetrics = {
        totalDepositsCount: parseInt(row.total_deposits_count) || 0,
        totalDepositsVolume: parseFloat(row.total_deposits_volume) || 0,
        totalWithdrawalsCount: parseInt(row.total_withdrawals_count) || 0,
        totalWithdrawalsVolume: parseFloat(row.total_withdrawals_volume) || 0,
        netDepositFlow: parseFloat(row.net_deposit_flow) || 0,
        avgDepositSize: parseFloat(row.avg_deposit_size) || 0,
        avgWithdrawalSize: parseFloat(row.avg_withdrawal_size) || 0,
        assetsUnderManagement: parseFloat(row.assets_under_management) || 0,
        uniqueDepositors: Math.round(parseFloat(row.unique_depositors)) || 0,
        uniqueWithdrawers: Math.round(parseFloat(row.unique_withdrawers)) || 0,
      };

      await this.cache.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));
      return metrics;
    } catch (error) {
      this.logger.error('Error fetching wallet metrics', error);
      throw error;
    }
  }

  /**
   * Get asset distribution (AUM breakdown)
   */
  async getAssetDistribution(): Promise<AssetDistribution[]> {
    try {
      const query = `
        WITH asset_balances AS (
          SELECT 
            asset,
            SUM(balance) as total_balance,
            COUNT(DISTINCT user_id) as user_count
          FROM wallets
          WHERE balance > 0
          GROUP BY asset
        ),
        total_aum AS (
          SELECT SUM(total_balance) as total FROM asset_balances
        )
        SELECT 
          ab.asset,
          ab.total_balance as balance,
          (ab.total_balance / NULLIF(t.total, 0) * 100) as percentage,
          ab.user_count,
          (ab.total_balance / NULLIF(ab.user_count, 0)) as avg_balance
        FROM asset_balances ab
        CROSS JOIN total_aum t
        ORDER BY ab.total_balance DESC
      `;

      const result = await this.db.query(query);

      return result.rows.map(row => ({
        asset: row.asset,
        balance: parseFloat(row.balance) || 0,
        percentage: parseFloat(row.percentage) || 0,
        userCount: parseInt(row.user_count) || 0,
        avgBalance: parseFloat(row.avg_balance) || 0,
      }));
    } catch (error) {
      this.logger.error('Error fetching asset distribution', error);
      throw error;
    }
  }

  /**
   * Get deposit/withdrawal trends
   */
  async getDepositWithdrawalTrends(days: number = 30): Promise<DepositWithdrawalTrend[]> {
    try {
      const query = `
        SELECT 
          time_bucket('1 day', time) as date,
          SUM(total_deposits_volume) as deposits,
          SUM(total_withdrawals_volume) as withdrawals,
          SUM(net_deposit_flow) as net_flow
        FROM metrics_daily_wallet
        WHERE time >= NOW() - INTERVAL '${days} days'
        GROUP BY date
        ORDER BY date ASC
      `;

      const result = await this.db.query(query);

      return result.rows.map(row => ({
        date: row.date,
        deposits: parseFloat(row.deposits) || 0,
        withdrawals: parseFloat(row.withdrawals) || 0,
        netFlow: parseFloat(row.net_flow) || 0,
      }));
    } catch (error) {
      this.logger.error('Error fetching deposit/withdrawal trends', error);
      throw error;
    }
  }

  /**
   * Get wallet balance distribution
   */
  async getWalletBalanceDistribution(): Promise<WalletBalanceDistribution[]> {
    try {
      const query = `
        SELECT 
          balance_range,
          SUM(user_count) as user_count,
          SUM(total_balance) as total_balance,
          AVG(percentage) as percentage
        FROM wallet_balance_distribution
        WHERE measured_at >= NOW() - INTERVAL '7 days'
        GROUP BY balance_range
        ORDER BY 
          CASE balance_range
            WHEN '0-100' THEN 1
            WHEN '100-1000' THEN 2
            WHEN '1000-10000' THEN 3
            WHEN '10000-100000' THEN 4
            WHEN '100000+' THEN 5
            ELSE 6
          END
      `;

      const result = await this.db.query(query);

      return result.rows.map(row => ({
        range: row.balance_range,
        userCount: parseInt(row.user_count) || 0,
        totalBalance: parseFloat(row.total_balance) || 0,
        percentage: parseFloat(row.percentage) || 0,
      }));
    } catch (error) {
      this.logger.error('Error fetching wallet balance distribution', error);
      throw error;
    }
  }

  /**
   * Get top depositors
   */
  async getTopDepositors(limit: number = 10, days: number = 30): Promise<any[]> {
    try {
      const query = `
        SELECT 
          user_id,
          COUNT(*) as deposit_count,
          SUM(amount) as total_deposited,
          AVG(amount) as avg_deposit
        FROM deposits
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY user_id
        ORDER BY total_deposited DESC
        LIMIT $1
      `;

      const result = await this.db.query(query, [limit]);

      return result.rows.map(row => ({
        userId: row.user_id,
        depositCount: parseInt(row.deposit_count) || 0,
        totalDeposited: parseFloat(row.total_deposited) || 0,
        avgDeposit: parseFloat(row.avg_deposit) || 0,
      }));
    } catch (error) {
      this.logger.error('Error fetching top depositors', error);
      throw error;
    }
  }

  /**
   * Get AUM trends
   */
  async getAUMTrends(days: number = 90): Promise<any[]> {
    try {
      const query = `
        SELECT 
          time_bucket('1 day', time) as date,
          AVG(assets_under_management) as aum
        FROM metrics_daily_wallet
        WHERE time >= NOW() - INTERVAL '${days} days'
        GROUP BY date
        ORDER BY date ASC
      `;

      const result = await this.db.query(query);

      return result.rows.map(row => ({
        date: row.date,
        aum: parseFloat(row.aum) || 0,
      }));
    } catch (error) {
      this.logger.error('Error fetching AUM trends', error);
      throw error;
    }
  }

  /**
   * Calculate and store wallet metrics (for ETL process)
   */
  async calculateAndStoreWalletMetrics(date: Date): Promise<void> {
    try {
      this.logger.info(`Calculating wallet metrics for ${date.toISOString()}`);

      // Get all assets
      const assetsResult = await this.db.query(
        'SELECT DISTINCT asset FROM wallets'
      );
      const assets = assetsResult.rows.map(r => r.asset);

      // Calculate metrics for each asset
      for (const asset of assets) {
        await this.calculateAssetMetrics(date, asset);
      }

      // Calculate balance distribution
      await this.calculateBalanceDistribution(date);

      this.logger.info(`Wallet metrics calculated and stored for ${date.toISOString()}`);
    } catch (error) {
      this.logger.error('Error calculating wallet metrics', error);
      throw error;
    }
  }

  /**
   * Calculate metrics for a specific asset
   */
  private async calculateAssetMetrics(date: Date, asset: string): Promise<void> {
    // Calculate deposits
    const depositsResult = await this.db.query(
      `SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as volume,
        COUNT(DISTINCT user_id) as unique_users
       FROM deposits
       WHERE DATE(created_at) = DATE($1)
       AND asset = $2`,
      [date, asset]
    );
    const deposits = depositsResult.rows[0];
    const totalDepositsCount = parseInt(deposits.count) || 0;
    const totalDepositsVolume = parseFloat(deposits.volume) || 0;
    const uniqueDepositors = parseInt(deposits.unique_users) || 0;
    const avgDepositSize = totalDepositsCount > 0 ? totalDepositsVolume / totalDepositsCount : 0;

    // Calculate withdrawals
    const withdrawalsResult = await this.db.query(
      `SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as volume,
        COUNT(DISTINCT user_id) as unique_users
       FROM withdrawals
       WHERE DATE(created_at) = DATE($1)
       AND asset = $2`,
      [date, asset]
    );
    const withdrawals = withdrawalsResult.rows[0];
    const totalWithdrawalsCount = parseInt(withdrawals.count) || 0;
    const totalWithdrawalsVolume = parseFloat(withdrawals.volume) || 0;
    const uniqueWithdrawers = parseInt(withdrawals.unique_users) || 0;
    const avgWithdrawalSize = totalWithdrawalsCount > 0 ? totalWithdrawalsVolume / totalWithdrawalsCount : 0;

    // Calculate net flow
    const netDepositFlow = totalDepositsVolume - totalWithdrawalsVolume;

    // Calculate AUM
    const aumResult = await this.db.query(
      `SELECT COALESCE(SUM(balance), 0) as aum
       FROM wallets
       WHERE asset = $1`,
      [asset]
    );
    const assetsUnderManagement = parseFloat(aumResult.rows[0].aum) || 0;

    // Insert metrics
    const insertQuery = `
      INSERT INTO metrics_daily_wallet (
        time, asset, total_deposits_count, total_deposits_volume,
        total_withdrawals_count, total_withdrawals_volume, net_deposit_flow,
        avg_deposit_size, avg_withdrawal_size, assets_under_management,
        unique_depositors, unique_withdrawers
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (time, asset) DO UPDATE SET
        total_deposits_count = EXCLUDED.total_deposits_count,
        total_deposits_volume = EXCLUDED.total_deposits_volume,
        total_withdrawals_count = EXCLUDED.total_withdrawals_count,
        total_withdrawals_volume = EXCLUDED.total_withdrawals_volume,
        net_deposit_flow = EXCLUDED.net_deposit_flow,
        avg_deposit_size = EXCLUDED.avg_deposit_size,
        avg_withdrawal_size = EXCLUDED.avg_withdrawal_size,
        assets_under_management = EXCLUDED.assets_under_management,
        unique_depositors = EXCLUDED.unique_depositors,
        unique_withdrawers = EXCLUDED.unique_withdrawers
    `;

    await this.db.query(insertQuery, [
      date,
      asset,
      totalDepositsCount,
      totalDepositsVolume,
      totalWithdrawalsCount,
      totalWithdrawalsVolume,
      netDepositFlow,
      avgDepositSize,
      avgWithdrawalSize,
      assetsUnderManagement,
      uniqueDepositors,
      uniqueWithdrawers,
    ]);
  }

  /**
   * Calculate wallet balance distribution
   */
  private async calculateBalanceDistribution(date: Date): Promise<void> {
    const ranges = [
      { name: '0-100', min: 0, max: 100 },
      { name: '100-1000', min: 100, max: 1000 },
      { name: '1000-10000', min: 1000, max: 10000 },
      { name: '10000-100000', min: 10000, max: 100000 },
      { name: '100000+', min: 100000, max: null },
    ];

    const totalUsersResult = await this.db.query(
      'SELECT COUNT(DISTINCT user_id) as total FROM wallets WHERE balance > 0'
    );
    const totalUsers = parseInt(totalUsersResult.rows[0].total) || 1;

    for (const range of ranges) {
      const condition = range.max 
        ? 'balance >= $1 AND balance < $2'
        : 'balance >= $1';
      const params = range.max ? [range.min, range.max] : [range.min];

      const rangeQuery = `
        SELECT 
          COUNT(DISTINCT user_id) as user_count,
          SUM(balance) as total_balance
        FROM wallets
        WHERE ${condition} AND balance > 0
      `;

      const result = await this.db.query(rangeQuery, params);
      const row = result.rows[0];

      const userCount = parseInt(row.user_count) || 0;
      const totalBalance = parseFloat(row.total_balance) || 0;
      const percentage = (userCount / totalUsers) * 100;

      const insertQuery = `
        INSERT INTO wallet_balance_distribution (
          measured_at, balance_range, user_count, total_balance, percentage
        ) VALUES ($1, $2, $3, $4, $5)
      `;

      await this.db.query(insertQuery, [
        date,
        range.name,
        userCount,
        totalBalance,
        percentage,
      ]);
    }
  }
}
