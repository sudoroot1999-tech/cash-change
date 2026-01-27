// Design Tokens - TypeScript definitions matching CSS variables
// This provides type-safe access to design tokens in JS/TS code

export const colors = {
  bg: {
    primary: 'var(--color-bg-primary)',
    secondary: 'var(--color-bg-secondary)',
    tertiary: 'var(--color-bg-tertiary)',
    elevated: 'var(--color-bg-elevated)',
    card: 'var(--color-bg-card)',
    cardHover: 'var(--color-bg-card-hover)',
  },
  border: {
    primary: 'var(--color-border-primary)',
    secondary: 'var(--color-border-secondary)',
    accent: 'var(--color-border-accent)',
  },
  text: {
    primary: 'var(--color-text-primary)',
    secondary: 'var(--color-text-secondary)',
    tertiary: 'var(--color-text-tertiary)',
    muted: 'var(--color-text-muted)',
  },
  accent: {
    50: 'var(--color-accent-50)',
    100: 'var(--color-accent-100)',
    200: 'var(--color-accent-200)',
    300: 'var(--color-accent-300)',
    400: 'var(--color-accent-400)',
    500: 'var(--color-accent-500)',
    600: 'var(--color-accent-600)',
    700: 'var(--color-accent-700)',
    800: 'var(--color-accent-800)',
    900: 'var(--color-accent-900)',
  },
  semantic: {
    success: 'var(--color-success)',
    successSoft: 'var(--color-success-soft)',
    danger: 'var(--color-danger)',
    dangerSoft: 'var(--color-danger-soft)',
    warning: 'var(--color-warning)',
    warningSoft: 'var(--color-warning-soft)',
    info: 'var(--color-info)',
    infoSoft: 'var(--color-info-soft)',
  },
} as const;

export const spacing = {
  0: 'var(--spacing-0)',
  1: 'var(--spacing-1)',
  2: 'var(--spacing-2)',
  3: 'var(--spacing-3)',
  4: 'var(--spacing-4)',
  5: 'var(--spacing-5)',
  6: 'var(--spacing-6)',
  8: 'var(--spacing-8)',
  10: 'var(--spacing-10)',
  12: 'var(--spacing-12)',
  16: 'var(--spacing-16)',
  20: 'var(--spacing-20)',
  24: 'var(--spacing-24)',
} as const;

export const radius = {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
  '2xl': 'var(--radius-2xl)',
  full: 'var(--radius-full)',
} as const;

export const shadows = {
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
  xl: 'var(--shadow-xl)',
  glow: 'var(--shadow-glow)',
  glowLg: 'var(--shadow-glow-lg)',
} as const;

export const transitions = {
  fast: 'var(--transition-fast)',
  base: 'var(--transition-base)',
  slow: 'var(--transition-slow)',
  slower: 'var(--transition-slower)',
} as const;

// Component variant types
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type CardVariant = 'default' | 'elevated' | 'outlined';
export type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info';
