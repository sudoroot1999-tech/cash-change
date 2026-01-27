import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Features',
  description:
    'Explore the powerful features of CryptoX exchange. Advanced trading tools, institutional-grade security, and real-time market data.',
};

const mainFeatures = [
  {
    icon: '📊',
    title: 'Advanced Trading Tools',
    description:
      'Professional charting with TradingView integration, technical indicators, and drawing tools for in-depth market analysis.',
    features: [
      '100+ Technical Indicators',
      'Multiple Chart Types',
      'Custom Timeframes',
      'Drawing Tools',
    ],
  },
  {
    icon: '⚡',
    title: 'High-Performance Engine',
    description:
      'Our matching engine processes millions of orders per second with sub-millisecond latency for lightning-fast execution.',
    features: ['1M+ Orders/Second', '<1ms Latency', '99.99% Uptime', 'Auto-Scaling'],
  },
  {
    icon: '🔒',
    title: 'Bank-Grade Security',
    description:
      'Multi-layer security with cold storage, multi-sig wallets, and continuous security audits to protect your assets.',
    features: ['Cold Storage', 'Multi-Signature', '2FA/MFA', 'Insurance Coverage'],
  },
  {
    icon: '📱',
    title: 'Cross-Platform Access',
    description:
      'Trade anywhere with our responsive web app, iOS and Android mobile apps, and powerful API for automated trading.',
    features: ['Web Platform', 'iOS App', 'Android App', 'REST & WebSocket API'],
  },
];

const tradingFeatures = [
  { icon: '💹', title: 'Spot Trading', description: 'Buy and sell crypto with instant settlement' },
  { icon: '📈', title: 'Margin Trading', description: 'Up to 10x leverage on selected pairs' },
  { icon: '🔄', title: 'Convert', description: 'Instant crypto-to-crypto conversion' },
  { icon: '💰', title: 'Staking', description: 'Earn rewards by staking supported tokens' },
  { icon: '📊', title: 'OTC Desk', description: 'Large volume trades with personalized service' },
  { icon: '🤖', title: 'Trading Bots', description: 'Automated trading strategies' },
];

const securityFeatures = [
  {
    title: 'Multi-Factor Authentication',
    description: 'SMS, Email, TOTP, and hardware key support',
  },
  {
    title: 'Withdrawal Whitelist',
    description: 'Only allow withdrawals to pre-approved addresses',
  },
  { title: 'Anti-Phishing Code', description: 'Verify official emails with your personal code' },
  { title: 'Device Management', description: 'Monitor and manage all connected devices' },
  { title: 'IP Restrictions', description: 'Limit account access by IP address' },
  { title: 'SOC 2 Certified', description: 'Annual security audits by top firms' },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-sm font-medium text-accent-400 mb-4 block">FEATURES</span>
          <h1 className="text-4xl md:text-6xl font-bold text-text-primary mb-6">
            Everything you need to <span className="text-gradient">trade crypto</span>
          </h1>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto mb-10">
            From beginner-friendly interfaces to advanced trading tools, CryptoX provides a complete
            suite of features for every type of trader.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/app/auth/register"
              className="px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl hover:from-accent-600 hover:to-accent-700 shadow-lg transition-all"
            >
              Start Trading
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-4 text-base font-semibold text-text-primary bg-bg-card border border-border-primary rounded-xl hover:bg-bg-card-hover transition-all"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Main Features Grid */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {mainFeatures.map((feature, index) => (
              <div key={index} className="glass-card p-8">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-text-primary mb-3">{feature.title}</h3>
                <p className="text-text-secondary mb-6">{feature.description}</p>
                <ul className="grid grid-cols-2 gap-2">
                  {feature.features.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-text-tertiary">
                      <svg
                        className="w-4 h-4 text-success"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trading Features */}
      <section className="py-24 bg-bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-accent-400 mb-4 block">TRADING</span>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Multiple ways to trade
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Whether you're a day trader or long-term investor, we have the right tools for you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tradingFeatures.map((feature, index) => (
              <div key={index} className="glass-card p-6 hover:scale-[1.02] transition-transform">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">{feature.title}</h3>
                <p className="text-sm text-text-secondary">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-sm font-medium text-accent-400 mb-4 block">SECURITY</span>
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
                Your security is our priority
              </h2>
              <p className="text-lg text-text-secondary mb-8">
                We employ industry-leading security measures to ensure your assets and data are
                always protected.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {securityFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        className="w-3 h-3 text-success"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary">{feature.title}</h4>
                      <p className="text-xs text-text-tertiary">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-8 text-center">
              <div className="text-6xl mb-6">🛡️</div>
              <h3 className="text-2xl font-bold text-text-primary mb-2">$500M+</h3>
              <p className="text-text-secondary mb-4">Insurance coverage for digital assets</p>
              <div className="flex justify-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-text-primary">99.9%</div>
                  <div className="text-xs text-text-tertiary">Uptime</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-text-primary">0</div>
                  <div className="text-xs text-text-tertiary">Security Breaches</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-text-primary">24/7</div>
                  <div className="text-xs text-text-tertiary">Monitoring</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
            Ready to experience these features?
          </h2>
          <p className="text-lg text-text-secondary mb-10">
            Join thousands of traders who trust CryptoX for their crypto journey.
          </p>
          <Link
            href="/app/auth/register"
            className="inline-flex px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl hover:from-accent-600 hover:to-accent-700 shadow-lg transition-all"
          >
            Create Free Account
          </Link>
        </div>
      </section>
    </div>
  );
}
