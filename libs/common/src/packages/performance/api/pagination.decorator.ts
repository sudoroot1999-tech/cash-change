import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
  cursor?: string;
}

export interface CursorPaginationParams {
  limit: number;
  cursor?: string;
  direction: 'forward' | 'backward';
}

/**
 * Offset-based pagination decorator
 */
export const Pagination = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): PaginationParams => {
    const request = ctx.switchToHttp().getRequest();
    const page = parseInt(request.query.page) || 1;
    const limit = Math.min(parseInt(request.query.limit) || 20, 100); // Max 100 items per page

    return {
      page,
      limit,
      offset: (page - 1) * limit,
    };
  },
);

/**
 * Cursor-based pagination decorator (better for large datasets)
 */
export const CursorPagination = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CursorPaginationParams => {
    const request = ctx.switchToHttp().getRequest();
    const limit = Math.min(parseInt(request.query.limit) || 20, 100);
    const cursor = request.query.cursor;
    const direction = request.query.direction === 'backward' ? 'backward' : 'forward';

    return {
      limit,
      cursor,
      direction,
    };
  },
);

/**
 * Pagination response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page?: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  meta: {
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

/**
 * Helper function to create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit);

  return {
    data,
    meta: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
}

/**
 * Helper function to create cursor-based paginated response
 */
export function createCursorPaginatedResponse<T>(
  data: T[],
  params: CursorPaginationParams,
  getCursor: (item: T) => string,
): CursorPaginatedResponse<T> {
  const hasNext = data.length > params.limit;
  const hasPrev = !!params.cursor;

  // Remove the extra item used for hasNext check
  const items = hasNext ? data.slice(0, -1) : data;

  return {
    data: items,
    meta: {
      limit: params.limit,
      hasNext,
      hasPrev,
      nextCursor: hasNext && items.length > 0 ? getCursor(items[items.length - 1]) : undefined,
      prevCursor: hasPrev && items.length > 0 ? getCursor(items[0]) : undefined,
    },
  };
}
