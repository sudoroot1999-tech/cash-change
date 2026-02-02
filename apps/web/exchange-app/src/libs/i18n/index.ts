import { Locale } from "../types";

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
    en: 'English',
    fa: 'فارسی',
    ar: 'العربية',
    'zh-CN': '简体中文',
    'zh-TW': '繁體中文',
    ru: 'Русский',
    es: 'Español',
    tr: 'Türkçe',
    fr: 'Français',
    de: 'Deutsch',
};

export const localeNativeNames: Record<Locale, string> = {
    en: 'English',
    fa: 'فارسی',
    ar: 'العربية',
    'zh-CN': '简体中文',
    'zh-TW': '繁體中文',
    ru: 'Русский',
    es: 'Español',
    tr: 'Türkçe',
    fr: 'Français',
    de: 'Deutsch',
};

export const rtlLocales: Locale[] = ['fa', 'ar'];

export const localeDirections: Record<Locale, 'ltr' | 'rtl'> = {
    en: 'ltr',
    fa: 'rtl',
    ar: 'rtl',
    'zh-CN': 'ltr',
    'zh-TW': 'ltr',
    ru: 'ltr',
    es: 'ltr',
    tr: 'ltr',
    fr: 'ltr',
    de: 'ltr',
};

// Currency symbols for each locale
export const localeCurrencies: Record<Locale, { symbol: string; code: string }> = {
    en: { symbol: '$', code: 'USD' },
    fa: { symbol: 'ریال', code: 'IRR' },
    ar: { symbol: '$', code: 'USD' },
    'zh-CN': { symbol: '¥', code: 'CNY' },
    'zh-TW': { symbol: 'NT$', code: 'TWD' },
    ru: { symbol: '₽', code: 'RUB' },
    es: { symbol: '€', code: 'EUR' },
    tr: { symbol: '₺', code: 'TRY' },
    fr: { symbol: '€', code: 'EUR' },
    de: { symbol: '€', code: 'EUR' },
};

// Number formatting preferences
export const localeNumberSystems: Record<Locale, string> = {
    en: 'latn',
    fa: 'arabext', // Persian digits
    ar: 'arab', // Arabic-Indic digits
    'zh-CN': 'latn',
    'zh-TW': 'latn',
    ru: 'latn',
    es: 'latn',
    tr: 'latn',
    fr: 'latn',
    de: 'latn',
};

// Calendar systems
export const localeCalendars: Record<Locale, string> = {
    en: 'gregory',
    fa: 'persian',
    ar: 'islamic',
    'zh-CN': 'gregory',
    'zh-TW': 'gregory',
    ru: 'gregory',
    es: 'gregory',
    tr: 'gregory',
    fr: 'gregory',
    de: 'gregory',
};

export * from "./calendar";
export * from "./formatters";
export * from "./rtl";
export * from "./utils";