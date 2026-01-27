import { Locale, locales, localeNames } from '@/libs/i18n';

export interface SEOMetadata {
  title: string;
  description: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  canonical?: string;
}

/**
 * Generate hreflang tags for multi-language SEO
 */
export function generateHreflangTags(
  currentPath: string,
  currentLocale: Locale,
  baseUrl: string
): Array<{ rel: string; hreflang: string; href: string }> {
  const tags = locales.map((locale) => ({
    rel: 'alternate',
    hreflang: locale,
    href: `${baseUrl}/${locale}${currentPath}`,
  }));

  // Add x-default for default language
  tags.push({
    rel: 'alternate',
    hreflang: 'x-default',
    href: `${baseUrl}/en${currentPath}`,
  });

  return tags;
}

/**
 * Generate localized metadata for Next.js
 */
export function generateLocalizedMetadata(
  metadata: SEOMetadata,
  locale: Locale,
  currentPath: string,
  baseUrl: string = process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com'
): any {
  const alternates = {
    canonical: `${baseUrl}/${locale}${currentPath}`,
    languages: {} as Record<string, string>,
  };

  // Add alternate language URLs
  locales.forEach((loc) => {
    alternates.languages[loc] = `${baseUrl}/${loc}${currentPath}`;
  });

  return {
    title: metadata.title,
    description: metadata.description,
    keywords: metadata.keywords,
    alternates,
    openGraph: {
      title: metadata.ogTitle || metadata.title,
      description: metadata.ogDescription || metadata.description,
      url: `${baseUrl}/${locale}${currentPath}`,
      siteName: 'Cash Change',
      locale: locale,
      type: 'website',
      ...(metadata.ogImage && {
        images: [
          {
            url: metadata.ogImage,
            width: 1200,
            height: 630,
            alt: metadata.ogTitle || metadata.title,
          },
        ],
      }),
    },
    twitter: {
      card: metadata.twitterCard || 'summary_large_image',
      title: metadata.ogTitle || metadata.title,
      description: metadata.ogDescription || metadata.description,
      ...(metadata.ogImage && { images: [metadata.ogImage] }),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

/**
 * Generate sitemap entries for all locales
 */
export function generateLocalizedSitemapEntries(
  paths: string[],
  baseUrl: string = process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com',
  priority: number = 0.7,
  changeFreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never' = 'daily'
): Array<{
  url: string;
  lastModified: Date;
  changeFrequency: string;
  priority: number;
  alternates: { languages: Record<string, string> };
}> {
  const entries: any[] = [];

  for (const path of paths) {
    for (const locale of locales) {
      const alternates: Record<string, string> = {};

      locales.forEach((loc) => {
        alternates[loc] = `${baseUrl}/${loc}${path}`;
      });

      entries.push({
        url: `${baseUrl}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: changeFreq,
        priority,
        alternates: { languages: alternates },
      });
    }
  }

  return entries;
}

/**
 * Generate structured data (JSON-LD) for organization
 */
export function generateOrganizationSchema(locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Cash Change',
    alternateName: localeNames[locale],
    url: process.env.NEXT_PUBLIC_BASE_URL,
    logo: `${process.env.NEXT_PUBLIC_BASE_URL}/logo.png`,
    sameAs: [
      'https://twitter.com/cryptoexchange',
      'https://facebook.com/cryptoexchange',
      'https://linkedin.com/company/cryptoexchange',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-555-123-4567',
      contactType: 'customer service',
      availableLanguage: locales,
    },
  };
}

/**
 * Generate structured data for breadcrumbs
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>,
  locale: Locale
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${process.env.NEXT_PUBLIC_BASE_URL}/${locale}${item.url}`,
    })),
  };
}

/**
 * Get locale-specific meta tags
 */
export function getLocaleMeta(locale: Locale) {
  const isRTL = locale === 'fa' || locale === 'ar';

  return [
    { name: 'language', content: locale },
    { httpEquiv: 'content-language', content: locale },
    { name: 'direction', content: isRTL ? 'rtl' : 'ltr' },
  ];
}

/**
 * Generate canonical URL
 */
export function getCanonicalUrl(path: string, locale: Locale, baseUrl: string): string {
  return `${baseUrl}/${locale}${path}`;
}
