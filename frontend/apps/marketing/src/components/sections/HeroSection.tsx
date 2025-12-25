import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 hero-gradient" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 text-sm font-medium bg-bg-card border border-border-primary rounded-full">
            <span className="px-2 py-0.5 text-xs font-semibold bg-accent-500 text-white rounded-full">
              NEW
            </span>
            <span className="text-text-secondary">1K+ Protocol Trusted Us</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-text-primary leading-tight mb-6">
            Promote your <span className="text-gradient">Web3 Startup</span> with this Platform
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10">
            Trade cryptocurrencies with advanced tools, real-time market data, and
            institutional-grade security. Join millions of traders worldwide.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/app/auth/register"
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl hover:from-accent-600 hover:to-accent-700 shadow-lg hover:shadow-xl transition-all animate-pulse-glow"
            >
              Get Started Free
            </Link>
            <Link
              href="/features"
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-text-primary bg-bg-card border border-border-primary rounded-xl hover:bg-bg-card-hover hover:border-border-secondary transition-all"
            >
              Explore Features
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-text-tertiary">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>24/7 Support</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Bank-grade security</span>
            </div>
          </div>
        </div>

        {/* Hero visual - Crypto cards preview */}
        <div className="mt-16 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[600px] h-[600px] bg-accent-500/20 rounded-full blur-[120px]" />
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Crypto Card 1 */}
            <div className="glass-card p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-[#F7931A] rounded-full flex items-center justify-center">
                <span className="text-white font-bold">₿</span>
              </div>
              <p className="text-sm text-text-tertiary mb-1">Bitcoin</p>
              <p className="text-2xl font-bold text-text-primary font-mono">$43,256.78</p>
              <p className="text-sm text-success mt-1">+2.34%</p>
            </div>

            {/* Crypto Card 2 */}
            <div className="glass-card p-6 text-center transform md:-translate-y-4">
              <div className="w-12 h-12 mx-auto mb-4 bg-[#627EEA] rounded-full flex items-center justify-center">
                <span className="text-white font-bold">Ξ</span>
              </div>
              <p className="text-sm text-text-tertiary mb-1">Ethereum</p>
              <p className="text-2xl font-bold text-text-primary font-mono">$2,256.45</p>
              <p className="text-sm text-danger mt-1">-1.23%</p>
            </div>

            {/* Crypto Card 3 */}
            <div className="glass-card p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-[#9945FF] rounded-full flex items-center justify-center">
                <span className="text-white font-bold">◎</span>
              </div>
              <p className="text-sm text-text-tertiary mb-1">Solana</p>
              <p className="text-2xl font-bold text-text-primary font-mono">$98.76</p>
              <p className="text-sm text-success mt-1">+5.67%</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
