import { type ClassValue, clsx } from "clsx"
import dynamic from "next/dynamic";
import { ComponentType, ReactElement, ReactNode } from "react";
import { twMerge } from "tailwind-merge"

export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
} as const;

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string, currency: string = 'USD'): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(num)
}

export function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num)
}

export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d)
}

export function formatRelativeTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`

    return formatDate(d)
}

export function getStatusColor(status: string): string {
    const statusColors: Record<string, string> = {
        active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
        suspended: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    }

    return statusColors[status.toLowerCase()] || 'bg-gray-100 text-gray-800'
}

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

/**
 * Conver snake case to camel case
 */
export function snakeToCamel<T extends Record<string, any>>(obj: T): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(snakeToCamel);

    return Object.keys(obj).reduce((acc, key) => {
        const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        acc[camelKey] = snakeToCamel(obj[key]);
        return acc;
    }, {} as any);
}

/**
 * Conver camel case to snake case
 */
export function camelToSnake<T extends Record<string, any>>(obj: T): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(camelToSnake);

    return Object.keys(obj).reduce((acc, key) => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        acc[snakeKey] = camelToSnake(obj[key]);
        return acc;
    }, {} as any);
}


