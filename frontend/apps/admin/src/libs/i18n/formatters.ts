import { Locale, localeCurrencies, localeNumberSystems } from '@libs/i18n';

/**
 * Format number based on locale
 */
export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions
): string {
  const numberSystem = localeNumberSystems[locale];
  
  return new Intl.NumberFormat(locale, {
    numberingSystem: numberSystem,
    ...options,
  }).format(value);
}

/**
 * Format currency based on locale
 */
export function formatCurrency(
  value: number,
  locale: Locale,
  currencyCode?: string
): string {
  const currency = currencyCode || localeCurrencies[locale].code;
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    numberingSystem: localeNumberSystems[locale],
  }).format(value);
}

/**
 * Format percentage based on locale
 */
export function formatPercentage(
  value: number,
  locale: Locale,
  decimals: number = 2
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    numberingSystem: localeNumberSystems[locale],
  }).format(value / 100);
}

/**
 * Format compact number (e.g., 1.2K, 3.4M)
 */
export function formatCompactNumber(
  value: number,
  locale: Locale
): string {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
    numberingSystem: localeNumberSystems[locale],
  }).format(value);
}

/**
 * Format date based on locale
 */
export function formatDate(
  date: Date | string | number,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;

  return new Intl.DateTimeFormat(locale, {
    ...options,
  }).format(dateObj);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(
  date: Date | string | number,
  locale: Locale
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  
  const intervals = [
    { seconds: 31536000, unit: 'year' },
    { seconds: 2592000, unit: 'month' },
    { seconds: 86400, unit: 'day' },
    { seconds: 3600, unit: 'hour' },
    { seconds: 60, unit: 'minute' },
    { seconds: 1, unit: 'second' },
  ] as const;
  
  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count !== 0) {
      return rtf.format(-count, interval.unit);
    }
  }
  
  return rtf.format(0, 'second');
}

/**
 * Parse number from localized string
 */
export function parseLocalizedNumber(
  value: string,
  locale: Locale
): number {
  // Get the decimal and thousands separators for this locale
  const parts = new Intl.NumberFormat(locale).formatToParts(1111.1);
  const thousandsSep = parts.find(p => p.type === 'group')?.value || ',';
  const decimalSep = parts.find(p => p.type === 'decimal')?.value || '.';
  
  // Remove thousands separators and replace decimal separator with '.'
  const normalized = value
    .replace(new RegExp('\\' + thousandsSep, 'g'), '')
    .replace(decimalSep, '.');
  
  return parseFloat(normalized);
}

/**
 * Get currency symbol for locale
 */
export function getCurrencySymbol(locale: Locale, currencyCode?: string): string {
  const currency = currencyCode || localeCurrencies[locale].code;
  return localeCurrencies[locale].symbol;
}
