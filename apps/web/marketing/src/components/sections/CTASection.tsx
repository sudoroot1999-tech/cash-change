import Link from 'next/link';

export function CTASection() {
  return (
    <section className="py-24 cta-section">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-text-primary mb-6">
          Ready to start trading?
        </h2>
        <p className="text-lg text-text-secondary mb-10 max-w-2xl mx-auto">
          Promote your Web3 Startup with this Framer Template. Join thousands of traders who trust
          CryptoX for their crypto journey.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/app/auth/register"
            className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl hover:from-accent-600 hover:to-accent-700 shadow-lg hover:shadow-xl transition-all"
          >
            Get Started Free
          </Link>
          <Link
            href="/contact"
            className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-text-primary bg-bg-card border border-border-primary rounded-xl hover:bg-bg-card-hover hover:border-border-secondary transition-all"
          >
            Contact Sales
          </Link>
        </div>

        <p className="mt-6 text-sm text-text-tertiary">
          No credit card required • Free 30-day trial • Cancel anytime
        </p>
      </div>
    </section>
  );
}
