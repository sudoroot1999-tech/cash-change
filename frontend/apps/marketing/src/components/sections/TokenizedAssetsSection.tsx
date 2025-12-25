import Link from 'next/link';

const features = [
  'Fractional Ownership of Assets',
  'Increased Asset Liquidity',
  'Simplified Asset Transfer Process',
];

export function TokenizedAssetsSection() {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <span className="text-sm font-medium text-accent-400 mb-4 block">TOKENIZATION</span>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
              Tokenized Assets
            </h2>
            <p className="text-lg text-text-secondary mb-8">
              Convert real-world assets into digital tokens for easier trading and liquidity.
            </p>

            <ul className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center">
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
                  </div>
                  <span className="text-text-primary">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/app/auth/register"
              className="inline-flex px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl hover:from-accent-600 hover:to-accent-700 shadow-md hover:shadow-lg transition-all"
            >
              Get Started
            </Link>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="glass-card p-8">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-text-primary mb-1">Sign in</h3>
                <p className="text-sm text-text-tertiary">Your blockchain wallet in one-click</p>
              </div>

              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-4 text-sm font-medium text-text-primary bg-bg-tertiary border border-border-primary rounded-xl hover:bg-bg-elevated transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border-primary"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-bg-card text-text-tertiary">or</span>
                </div>
              </div>

              <button className="w-full px-4 py-3 text-sm font-medium text-text-primary bg-bg-tertiary border border-border-primary rounded-xl hover:bg-bg-elevated transition-colors">
                Continue with Email
              </button>

              <p className="text-center text-xs text-text-tertiary mt-4">View more options</p>
            </div>

            {/* Floating card */}
            <div className="absolute -bottom-4 -right-4 glass-card p-4 max-w-[200px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-tertiary">USDT Vault</span>
                <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded">
                  Low Risk
                </span>
              </div>
              <p className="text-2xl font-bold text-text-primary mb-1">04.11% APY</p>
              <p className="text-xs text-text-tertiary">TVL: $81,923.23</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
