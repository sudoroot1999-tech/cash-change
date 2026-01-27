import { Locale, locales } from '@/libs/i18n';

/**
 * Validate if a string is a supported locale
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Get locale from string with fallback
 */
export function parseLocale(locale: string | undefined): Locale {
  if (!locale || !isValidLocale(locale)) {
    return 'en';
  }
  return locale;
}

/**
 * Get browser's preferred locale
 */
export function getBrowserLocale(): Locale {
  if (typeof window === 'undefined') return 'en';

  const browserLang = window.navigator.language.split('-')[0];
  return isValidLocale(browserLang) ? browserLang : 'en';
}

/**
 * Store locale preference
 */
export function storeLocalePreference(locale: Locale): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('preferred-locale', locale);
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`; // 1 year
}

/**
 * Get stored locale preference
 */
export function getStoredLocalePreference(): Locale | null {
  if (typeof window === 'undefined') return null;

  // Check localStorage first
  const stored = localStorage.getItem('preferred-locale');
  if (stored && isValidLocale(stored)) {
    return stored;
  }

  // Check cookie
  const cookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('NEXT_LOCALE='));
  
  if (cookie) {
    const value = cookie.split('=')[1];
    if (isValidLocale(value)) {
      return value;
    }
  }

  return null;
}

/**
 * Build localized URL path
 */
export function buildLocalizedPath(path: string, locale: Locale): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  // Remove any existing locale prefix
  const pathWithoutLocale = cleanPath.replace(/^(en|fa|ar|zh-CN|zh-TW|ru|es|tr|fr|de)\//, '');
  
  // Add new locale prefix
  return `/${locale}/${pathWithoutLocale}`;
}

/**
 * Extract locale from path
 */
export function extractLocaleFromPath(path: string): { locale: Locale; pathWithoutLocale: string } {
  const segments = path.split('/').filter(Boolean);
  
  if (segments.length > 0 && isValidLocale(segments[0])) {
    return {
      locale: segments[0] as Locale,
      pathWithoutLocale: '/' + segments.slice(1).join('/'),
    };
  }

  return {
    locale: 'en',
    pathWithoutLocale: path,
  };
}

/**
 * Format locale display name
 */
export function getLocaleDisplayName(locale: Locale, inLocale?: Locale): string {
  try {
    const displayNames = new Intl.DisplayNames([inLocale || locale], { type: 'language' });
    return displayNames.of(locale) || locale;
  } catch {
    return locale;
  }
}

/**
 * Check if two locales use the same script/direction
 */
export function haveSameDirection(locale1: Locale, locale2: Locale): boolean {
  const rtlLocales = ['fa', 'ar'];
  const isLocale1RTL = rtlLocales.includes(locale1);
  const isLocale2RTL = rtlLocales.includes(locale2);
  return isLocale1RTL === isLocale2RTL;
}

/**
 * Pluralize based on count and locale rules
 */
export function pluralize(
  count: number,
  locale: Locale,
  forms: { zero?: string; one: string; two?: string; few?: string; many?: string; other: string }
): string {
  const pluralRules = new Intl.PluralRules(locale);
  const rule = pluralRules.select(count);

  return forms[rule as keyof typeof forms] || forms.other;
}

/**
 * Get relative time formatter
 */
export function getRelativeTimeString(
  date: Date,
  locale: Locale,
  style: 'long' | 'short' | 'narrow' = 'long'
): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style });
  const now = new Date();
  const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);

  const intervals = [
    { unit: 'year', seconds: 31536000 },
    { unit: 'month', seconds: 2592000 },
    { unit: 'week', seconds: 604800 },
    { unit: 'day', seconds: 86400 },
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 },
    { unit: 'second', seconds: 1 },
  ] as const;

  for (const { unit, seconds } of intervals) {
    const count = Math.floor(diffInSeconds / seconds);
    if (Math.abs(count) >= 1) {
      return rtf.format(count, unit);
    }
  }

  return rtf.format(0, 'second');
}

/**
 * Sort array based on locale collation
 */
export function sortByLocale<T>(
  array: T[],
  locale: Locale,
  getValue: (item: T) => string
): T[] {
  const collator = new Intl.Collator(locale, {
    numeric: true,
    sensitivity: 'base',
  });

  return [...array].sort((a, b) => collator.compare(getValue(a), getValue(b)));
}

/**
 * Generate language selector options
 */
export function getLanguageOptions(currentLocale: Locale) {
  return locales.map(locale => ({
    value: locale,
    label: getLocaleDisplayName(locale, currentLocale),
    nativeLabel: getLocaleDisplayName(locale, locale),
    isRTL: ['fa', 'ar'].includes(locale),
    isCurrent: locale === currentLocale,
  }));
}
