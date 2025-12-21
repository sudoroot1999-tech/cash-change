import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'CryptoX - Professional Cryptocurrency Exchange',
    template: '%s | CryptoX',
  },
  description: 'Trade cryptocurrencies with advanced tools, real-time market data, and institutional-grade security. Join millions of traders worldwide.',
  keywords: ['cryptocurrency', 'bitcoin', 'ethereum', 'trading', 'exchange', 'crypto', 'blockchain'],
  authors: [{ name: 'CryptoX' }],
  creator: 'CryptoX',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://cryptox.exchange',
    siteName: 'CryptoX',
    title: 'CryptoX - Professional Cryptocurrency Exchange',
    description: 'Trade cryptocurrencies with advanced tools, real-time market data, and institutional-grade security.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CryptoX Exchange',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CryptoX - Professional Cryptocurrency Exchange',
    description: 'Trade cryptocurrencies with advanced tools and institutional-grade security.',
    images: ['/og-image.png'],
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-bg-primary text-text-primary antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
