import { PAGINATION } from '../constants';

/**
 * Generate a random alphanumeric string
 */
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a referral code
 */
export function generateReferralCode(): string {
  return generateRandomString(8).toUpperCase();
}

/**
 * Format decimal string with precision
 */
export function formatDecimal(value: string | number, precision: number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toFixed(precision);
}

/**
 * Parse pagination parameters with defaults
 */
export function parsePagination(
  page?: number | string,
  limit?: number | string,
): { page: number; limit: number; offset: number } {
  const parsedPage = Math.max(1, parseInt(String(page || PAGINATION.DEFAULT_PAGE), 10));
  const parsedLimit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(String(limit || PAGINATION.DEFAULT_LIMIT), 10)),
  );
  return {
    page: parsedPage,
    limit: parsedLimit,
    offset: (parsedPage - 1) * parsedLimit,
  };
}

/**
 * Calculate total pages
 */
export function calculateTotalPages(total: number, limit: number): number {
  return Math.ceil(total / limit);
}

/**
 * Mask sensitive data (email, phone)
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (local.length <= 3) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.slice(0, 3)}***@${domain}`;
}

export function maskPhone(phone: string): string {
  if (phone.length < 6) return '***';
  return `${phone.slice(0, 3)}****${phone.slice(-3)}`;
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

/**
 * Validate Ethereum address
 */
export function isValidEthAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate Bitcoin address (basic validation)
 */
export function isValidBtcAddress(address: string): boolean {
  // P2PKH, P2SH, or Bech32
  return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || /^bc1[ac-hj-np-z02-9]{39,59}$/.test(address);
}

/**
 * Calculate trading fee
 */
export function calculateFee(amount: string, feeRate: string): string {
  const amountNum = parseFloat(amount);
  const rateNum = parseFloat(feeRate);
  return (amountNum * rateNum).toFixed(18);
}

/**
 * Compare decimal strings
 */
export function compareDecimals(a: string, b: string): number {
  const numA = parseFloat(a);
  const numB = parseFloat(b);
  if (numA < numB) return -1;
  if (numA > numB) return 1;
  return 0;
}

/**
 * Check if order can be matched (price overlap)
 */
export function canMatchOrders(
  buyPrice: string,
  sellPrice: string,
  buyType: string,
  sellType: string,
): boolean {
  if (buyType === 'market' || sellType === 'market') return true;
  return compareDecimals(buyPrice, sellPrice) >= 0;
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Generate order ID
 */
export function generateOrderId(): string {
  const timestamp = Date.now().toString(36);
  const random = generateRandomString(8);
  return `${timestamp}-${random}`.toUpperCase();
}

/**
 * Parse sort parameter
 */
export function parseSort(
  sort?: string,
  allowedFields: string[] = [],
): { field: string; order: 'ASC' | 'DESC' } | null {
  if (!sort) return null;
  const [field, order] = sort.split(':');
  if (!allowedFields.includes(field)) return null;
  return {
    field,
    order: order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
  };
}
