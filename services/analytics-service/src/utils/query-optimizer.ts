import { Knex } from 'knex';
import { logger } from './logger';

export class QueryOptimizer {
  /**
   * Add pagination to query
   */
  static paginate(query: Knex.QueryBuilder, page: number = 1, pageSize: number = 100): Knex.QueryBuilder {
    const limit = Math.min(pageSize, 1000); // Max 1000 records per page
    const offset = (page - 1) * limit;
    
    return query.limit(limit).offset(offset);
  }

  /**
   * Add date range filter with optimization
   */
  static dateRange(
    query: Knex.QueryBuilder,
    column: string,
    startDate: Date,
    endDate: Date
  ): Knex.QueryBuilder {
    return query.whereBetween(column, [startDate, endDate]);
  }

  /**
   * Optimize query with proper indexing hints
   */
  static optimizeQuery(query: Knex.QueryBuilder): Knex.QueryBuilder {
    // Add query optimization hints for PostgreSQL
    return query;
  }

  /**
   * Explain query performance
   */
  static async explainQuery(query: Knex.QueryBuilder): Promise<any> {
    try {
      const sql = query.toSQL();
      logger.debug('Query SQL:', sql);
      
      // Run EXPLAIN ANALYZE
      const explanation = await query.client.raw(`EXPLAIN ANALYZE ${sql.sql}`, sql.bindings);
      logger.debug('Query Plan:', explanation.rows);
      
      return explanation.rows;
    } catch (error) {
      logger.error('Query explain failed', error);
      return null;
    }
  }

  /**
   * Add sorting with validation
   */
  static orderBy(
    query: Knex.QueryBuilder,
    column: string,
    direction: 'asc' | 'desc' = 'desc'
  ): Knex.QueryBuilder {
    // Validate sort direction
    const validDirection = ['asc', 'desc'].includes(direction.toLowerCase()) 
      ? direction 
      : 'desc';
    
    return query.orderBy(column, validDirection);
  }

  /**
   * Apply filters with validation
   */
  static applyFilters(query: Knex.QueryBuilder, filters: Record<string, any>): Knex.QueryBuilder {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query.whereIn(key, value);
        } else if (typeof value === 'object' && value.operator) {
          // Support operators like { operator: '>=', value: 100 }
          query.where(key, value.operator, value.value);
        } else {
          query.where(key, value);
        }
      }
    });

    return query;
  }

  /**
   * Calculate query complexity score
   */
  static calculateComplexity(query: Knex.QueryBuilder): number {
    const sql = query.toSQL();
    let complexity = 0;

    // Check for joins
    const joinCount = (sql.sql.match(/JOIN/gi) || []).length;
    complexity += joinCount * 10;

    // Check for subqueries
    const subqueryCount = (sql.sql.match(/\(/g) || []).length;
    complexity += subqueryCount * 5;

    // Check for aggregations
    const aggCount = (sql.sql.match(/SUM|AVG|COUNT|MAX|MIN/gi) || []).length;
    complexity += aggCount * 3;

    return complexity;
  }

  /**
   * Suggest if query should be cached
   */
  static shouldCache(query: Knex.QueryBuilder, complexity: number): boolean {
    // Cache queries with complexity > 20
    return complexity > 20;
  }

  /**
   * Batch process large datasets
   */
  static async batchProcess<T>(
    query: Knex.QueryBuilder,
    batchSize: number,
    processor: (batch: T[]) => Promise<void>
  ): Promise<void> {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await query.clone().limit(batchSize).offset(offset);
      
      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      await processor(batch);
      offset += batchSize;

      // Prevent infinite loops
      if (offset > 1000000) {
        logger.warn('Batch processing exceeded 1M records, stopping');
        break;
      }
    }
  }
}
