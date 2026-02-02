import { Locale } from "../types";


/**
 * Persian (Jalali) Calendar utilities
 */
export class PersianCalendar {
  private static readonly PERSIAN_EPOCH = 1948321;
  private static readonly GREGORIAN_EPOCH = 1721426;

  /**
   * Convert Gregorian date to Persian (Jalali) date
   */
  static gregorianToPersian(date: Date): { year: number; month: number; day: number } {
    const jd = this.gregorianToJD(date);
    return this.jdToPersian(jd);
  }

  /**
   * Convert Persian (Jalali) date to Gregorian date
   */
  static persianToGregorian(year: number, month: number, day: number): Date {
    const jd = this.persianToJD(year, month, day);
    return this.jdToGregorian(jd);
  }

  /**
   * Format Persian date
   */
  static format(date: Date, format: string = 'YYYY/MM/DD'): string {
    const persian = this.gregorianToPersian(date);
    return format
      .replace('YYYY', persian.year.toString())
      .replace('MM', persian.month.toString().padStart(2, '0'))
      .replace('DD', persian.day.toString().padStart(2, '0'));
  }

  /**
   * Get Persian month names
   */
  static getMonthNames(): string[] {
    return [
      'فروردین',
      'اردیبهشت',
      'خرداد',
      'تیر',
      'مرداد',
      'شهریور',
      'مهر',
      'آبان',
      'آذر',
      'دی',
      'بهمن',
      'اسفند',
    ];
  }

  /**
   * Get Persian weekday names
   */
  static getWeekdayNames(): string[] {
    return [
      'یکشنبه',
      'دوشنبه',
      'سه‌شنبه',
      'چهارشنبه',
      'پنج‌شنبه',
      'جمعه',
      'شنبه',
    ];
  }

  private static gregorianToJD(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    
    return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 
           Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  }

  private static jdToGregorian(jd: number): Date {
    const a = jd + 32044;
    const b = Math.floor((4 * a + 3) / 146097);
    const c = a - Math.floor((146097 * b) / 4);
    const d = Math.floor((4 * c + 3) / 1461);
    const e = c - Math.floor((1461 * d) / 4);
    const m = Math.floor((5 * e + 2) / 153);
    
    const day = e - Math.floor((153 * m + 2) / 5) + 1;
    const month = m + 3 - 12 * Math.floor(m / 10);
    const year = 100 * b + d - 4800 + Math.floor(m / 10);
    
    return new Date(year, month - 1, day);
  }

  private static jdToPersian(jd: number): { year: number; month: number; day: number } {
    const depoch = jd - this.PERSIAN_EPOCH;
    const cycle = Math.floor(depoch / 1029983);
    const cyear = depoch % 1029983;
    
    let ycycle: number;
    if (cyear < 366) {
      ycycle = 0;
    } else {
      const aux1 = Math.floor((cyear - 1) / 365);
      const aux2 = ((cyear - 1) % 365);
      ycycle = Math.floor(((aux1 + 1) * 682 + aux2) / 1029983);
    }
    
    const year = ycycle + cycle * 2820 + 1;
    const yday = jd - this.persianToJD(year, 1, 1) + 1;
    const month = yday <= 186 ? Math.ceil(yday / 31) : Math.ceil((yday - 6) / 30);
    const day = jd - this.persianToJD(year, month, 1) + 1;
    
    return { year, month, day };
  }

  private static persianToJD(year: number, month: number, day: number): number {
    const epyear = year - 474;
    const cycle = Math.floor(epyear / 2820);
    const cyear = epyear % 2820;
    
    const aux1 = month <= 7 ? (month - 1) * 31 : (month - 1) * 30 + 6;
    const aux2 = Math.floor((cyear * 682 - 110) / 1029983);
    const aux3 = (cyear - 1) * 365 + aux2;
    
    return day + aux1 + aux3 + cycle * 1029983 + this.PERSIAN_EPOCH - 1;
  }
}

/**
 * Islamic (Hijri) Calendar utilities
 */
export class IslamicCalendar {
  /**
   * Convert Gregorian date to Islamic (Hijri) date
   */
  static gregorianToIslamic(date: Date): { year: number; month: number; day: number } {
    // Simple approximation - for production use a proper library
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const gregorianDays = this.gregorianToJulian(year, month, day);
    const islamicDays = gregorianDays - 1948440;
    
    const islamicYear = Math.floor((islamicDays / 354.367) + 1);
    const islamicMonth = Math.floor(((islamicDays % 354.367) / 29.5) + 1);
    const islamicDay = Math.floor((islamicDays % 354.367) % 29.5) + 1;
    
    return {
      year: islamicYear,
      month: Math.min(islamicMonth, 12),
      day: Math.min(islamicDay, 30),
    };
  }

  /**
   * Get Islamic month names
   */
  static getMonthNames(): string[] {
    return [
      'محرم',
      'صفر',
      'ربيع الأول',
      'ربيع الثاني',
      'جمادى الأولى',
      'جمادى الآخرة',
      'رجب',
      'شعبان',
      'رمضان',
      'شوال',
      'ذو القعدة',
      'ذو الحجة',
    ];
  }

  /**
   * Format Islamic date
   */
  static format(date: Date, format: string = 'YYYY/MM/DD'): string {
    const islamic = this.gregorianToIslamic(date);
    return format
      .replace('YYYY', islamic.year.toString())
      .replace('MM', islamic.month.toString().padStart(2, '0'))
      .replace('DD', islamic.day.toString().padStart(2, '0'));
  }

  private static gregorianToJulian(year: number, month: number, day: number): number {
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    
    return day + Math.floor((153 * m + 2) / 5) + 365 * y + 
           Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  }
}

/**
 * Format date based on calendar system
 */
export function formatDateByCalendar(
  date: Date,
  locale: Locale,
  calendar: 'gregory' | 'persian' | 'islamic' = 'gregory'
): string {
  switch (calendar) {
    case 'persian':
      return PersianCalendar.format(date);
    case 'islamic':
      return IslamicCalendar.format(date);
    default:
      return new Intl.DateTimeFormat(locale).format(date);
  }
}

/**
 * Get month names for calendar system
 */
export function getMonthNames(
  locale: Locale,
  calendar: 'gregory' | 'persian' | 'islamic' = 'gregory'
): string[] {
  switch (calendar) {
    case 'persian':
      return PersianCalendar.getMonthNames();
    case 'islamic':
      return IslamicCalendar.getMonthNames();
    default:
      return Array.from({ length: 12 }, (_, i) => 
        new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2024, i, 1))
      );
  }
}
