import { Locale, rtlLocales, localeDirections } from '@/libs/i18n';

/**
 * Check if locale is RTL
 */
export function isRTL(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

/**
 * Get text direction for locale
 */
export function getDirection(locale: Locale): 'ltr' | 'rtl' {
  return localeDirections[locale];
}

/**
 * Get opposite direction
 */
export function getOppositeDirection(direction: 'ltr' | 'rtl'): 'ltr' | 'rtl' {
  return direction === 'ltr' ? 'rtl' : 'ltr';
}

/**
 * Convert logical CSS property to physical based on direction
 */
export function getPhysicalProperty(
  logical: 'start' | 'end',
  direction: 'ltr' | 'rtl'
): 'left' | 'right' {
  if (logical === 'start') {
    return direction === 'ltr' ? 'left' : 'right';
  }
  return direction === 'ltr' ? 'right' : 'left';
}

/**
 * RTL-aware className utility
 */
export function rtlClass(
  ltrClass: string,
  rtlClass: string,
  direction: 'ltr' | 'rtl'
): string {
  return direction === 'rtl' ? rtlClass : ltrClass;
}

/**
 * Generate RTL-aware styles
 */
export function rtlStyle(direction: 'ltr' | 'rtl') {
  return {
    direction,
    textAlign: direction === 'rtl' ? ('right' as const) : ('left' as const),
  };
}

/**
 * Flip margin/padding for RTL
 */
export function flipSpacing(
  property: 'margin' | 'padding',
  values: string,
  direction: 'ltr' | 'rtl'
): Record<string, string> {
  if (direction === 'ltr') {
    return { [property]: values };
  }

  // Split the values (top right bottom left)
  const parts = values.trim().split(/\s+/);
  
  if (parts.length === 4) {
    // Swap left and right
    return { [property]: `${parts[0]} ${parts[3]} ${parts[2]} ${parts[1]}` };
  } else if (parts.length === 2) {
    // Already symmetric
    return { [property]: values };
  }
  
  return { [property]: values };
}

/**
 * Get border radius for RTL
 */
export function rtlBorderRadius(
  topLeft: string,
  topRight: string,
  bottomRight: string,
  bottomLeft: string,
  direction: 'ltr' | 'rtl'
): Record<string, string> {
  if (direction === 'ltr') {
    return {
      borderTopLeftRadius: topLeft,
      borderTopRightRadius: topRight,
      borderBottomRightRadius: bottomRight,
      borderBottomLeftRadius: bottomLeft,
    };
  }
  
  return {
    borderTopLeftRadius: topRight,
    borderTopRightRadius: topLeft,
    borderBottomRightRadius: bottomLeft,
    borderBottomLeftRadius: bottomRight,
  };
}

/**
 * Transform value for RTL (e.g., translateX)
 */
export function rtlTransform(value: number, direction: 'ltr' | 'rtl'): number {
  return direction === 'rtl' ? -value : value;
}

/**
 * Get flex direction for RTL
 */
export function rtlFlexDirection(
  direction: 'ltr' | 'rtl',
  base: 'row' | 'row-reverse' | 'column' | 'column-reverse' = 'row'
): string {
  if (base === 'row' && direction === 'rtl') {
    return 'row-reverse';
  }
  if (base === 'row-reverse' && direction === 'rtl') {
    return 'row';
  }
  return base;
}
