import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';

/**
 * DataLoader service to prevent N+1 query problems
 * Batches and caches database requests within a single request context
 */
@Injectable()
export class DataLoaderService {
  /**
   * Create a new DataLoader for batching database queries
   */
  createLoader<K, V>(
    batchLoadFn: (keys: readonly K[]) => Promise<V[]>,
    options?: {
      maxBatchSize?: number;
      cache?: boolean;
      cacheKeyFn?: (key: K) => any;
    },
  ): DataLoader<K, V> {
    return new DataLoader<K, V>(batchLoadFn, {
      maxBatchSize: options?.maxBatchSize || 100,
      cache: options?.cache !== false,
      cacheKeyFn: options?.cacheKeyFn,
    });
  }

  /**
   * Example: Create a user loader
   */
  createUserLoader(
    userRepository: any, // Replace with actual UserRepository type
  ): DataLoader<number, any> {
    return this.createLoader(async (userIds: readonly number[]) => {
      const users = await userRepository.findByIds([...userIds]);
      
      // Create a map for O(1) lookups
      const userMap = new Map(users.map(user => [user.id, user]));
      
      // Return users in the same order as requested
      return userIds.map(id => userMap.get(id) || null);
    });
  }

  /**
   * Example: Create an order loader
   */
  createOrderLoader(
    orderRepository: any,
  ): DataLoader<number, any> {
    return this.createLoader(async (orderIds: readonly number[]) => {
      const orders = await orderRepository.findByIds([...orderIds]);
      const orderMap = new Map(orders.map(order => [order.id, order]));
      return orderIds.map(id => orderMap.get(id) || null);
    });
  }

  /**
   * Example: Create a wallet loader by user
   */
  createWalletsByUserLoader(
    walletRepository: any,
  ): DataLoader<number, any[]> {
    return this.createLoader(async (userIds: readonly number[]) => {
      const wallets = await walletRepository
        .createQueryBuilder('wallet')
        .where('wallet.userId IN (:...userIds)', { userIds: [...userIds] })
        .getMany();
      
      // Group wallets by user ID
      const walletsByUser = new Map<number, any[]>();
      wallets.forEach(wallet => {
        const existing = walletsByUser.get(wallet.userId) || [];
        existing.push(wallet);
        walletsByUser.set(wallet.userId, existing);
      });
      
      // Return wallets in the same order as requested users
      return userIds.map(id => walletsByUser.get(id) || []);
    });
  }

  /**
   * Example: Create a trade count loader
   */
  createTradeCountLoader(
    tradeRepository: any,
  ): DataLoader<number, number> {
    return this.createLoader<number, number>(async (userIds: readonly number[]): Promise<number[]> => {
      const counts = await tradeRepository
        .createQueryBuilder('trade')
        .select('trade.userId', 'userId')
        .addSelect('COUNT(*)', 'count')
        .where('trade.userId IN (:...userIds)', { userIds: [...userIds] })
        .groupBy('trade.userId')
        .getRawMany();
      
      const countMap = new Map<number, number>(counts.map((c: any) => [c.userId, parseInt(c.count, 10)]));
      return userIds.map(id => countMap.get(id) || 0);
    });
  }

  /**
   * Create a composite key loader (e.g., for userId + symbol combinations)
   */
  createCompositeKeyLoader<V>(
    batchLoadFn: (keys: readonly string[]) => Promise<V[]>,
  ): DataLoader<string, V> {
    return this.createLoader(batchLoadFn, {
      cacheKeyFn: (key: string) => key,
    });
  }

  /**
   * Example: Position loader by user and symbol
   */
  createPositionLoader(
    positionRepository: any,
  ): DataLoader<string, any> {
    return this.createCompositeKeyLoader(async (keys: readonly string[]) => {
      // Parse composite keys "userId:symbol"
      const parsedKeys = keys.map(key => {
        const [userId, symbol] = key.split(':');
        return { userId: parseInt(userId), symbol };
      });

      const positions = await positionRepository
        .createQueryBuilder('position')
        .where('(position.userId, position.symbol) IN (:...pairs)', {
          pairs: parsedKeys.map(k => `(${k.userId},'${k.symbol}')`).join(','),
        })
        .getMany();

      const positionMap = new Map(
        positions.map(p => [`${p.userId}:${p.symbol}`, p]),
      );

      return keys.map(key => positionMap.get(key) || null);
    });
  }
}

/**
 * DataLoader context interface
 * Use this in request-scoped providers
 */
export interface DataLoaderContext {
  userLoader: DataLoader<number, any>;
  orderLoader: DataLoader<number, any>;
  walletsByUserLoader: DataLoader<number, any[]>;
  tradeCountLoader: DataLoader<number, number>;
  positionLoader: DataLoader<string, any>;
}
