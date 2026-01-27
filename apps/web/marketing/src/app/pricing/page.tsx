'use client';

import { useState } from 'react';
import Link from 'next/link';

const plans = [
  {
    name: 'Starter',
    description: 'Perfect for beginners exploring crypto',
    price: { monthly: 0, annual: 0 },
    features: [
      'Spot trading',
      'Basic order types (market, limit)',
      '0.1% trading fee',
      'Email support',
      '2FA security',
      'Mobile app access',
    ],
    cta: 'Start Free',
    popular: false,
  },
  {
    name: 'Trader',
    description: 'For active traders seeking more features',
    price: { monthly: 29, annual: 24 },
    features: [
      'Everything in Starter',
      'Margin trading (up to 5x)',
      '0.05% trading fee',
      'Advanced order types',
      'Priority support',
      'API access',
      'Real-time alerts',
    ],
    cta: 'Start 14-Day Trial',
    popular: true,
  },
  {
    name: 'Pro',
    description: 'For professional traders and institutions',
    price: { monthly: 99, annual: 79 },
    features: [
      'Everything in Trader',
      'Margin trading (up to 10x)',
      '0.02% trading fee',
      'OTC desk access',
      'Dedicated account manager',
      'Custom integrations',
      'Advanced analytics',
      'Phone support',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

const tradingFees = [
  { tier: 'Starter', volume: '$0 - $50K', maker: '0.10%', taker: '0.10%' },
  { tier: 'Bronze', volume: '$50K - $100K', maker: '0.08%', taker: '0.10%' },
  { tier: 'Silver', volume: '$100K - $500K', maker: '0.06%', taker: '0.08%' },
  { tier: 'Gold', volume: '$500K - $1M', maker: '0.04%', taker: '0.06%' },
  { tier: 'Platinum', volume: '$1M - $5M', maker: '0.02%', taker: '0.04%' },
  { tier: 'VIP', volume: '$5M+', maker: '0.00%', taker: '0.02%' },
];

const faqs = [
  {
    question: 'Can I switch plans at any time?',
    answer:
      'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and billing is prorated.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept credit/debit cards, bank transfers, and cryptocurrency payments (BTC, ETH, USDT).',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes! The Trader plan includes a 14-day free trial. No credit card required to start.',
  },
  {
    question: 'How are trading fees calculated?',
    answer: 'Trading fees are based on your 30-day trading volume. Higher volume means lower fees.',
  },
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-sm font-medium text-accent-400 mb-4 block">PRICING</span>
          <h1 className="text-4xl md:text-6xl font-bold text-text-primary mb-6">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto mb-10">
            Choose the plan that's right for you. Start free and upgrade as you grow.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 p-1 bg-bg-card border border-border-primary rounded-xl">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                !isAnnual ? 'bg-bg-elevated text-text-primary' : 'text-text-tertiary'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isAnnual ? 'bg-bg-elevated text-text-primary' : 'text-text-tertiary'
              }`}
            >
              Annual
              <span className="ml-2 px-2 py-0.5 text-xs bg-success/20 text-success rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`glass-card p-8 relative ${plan.popular ? 'border-2 border-accent-500 shadow-glow' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-accent-500 to-accent-600 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <h3 className="text-xl font-bold text-text-primary mb-2">{plan.name}</h3>
                <p className="text-sm text-text-secondary mb-6">{plan.description}</p>

                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-bold text-text-primary">
                    ${isAnnual ? plan.price.annual : plan.price.monthly}
                  </span>
                  {plan.price.monthly > 0 && (
                    <span className="text-text-tertiary ml-2">/month</span>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <svg
                        className="w-5 h-5 text-success flex-shrink-0"
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
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.name === 'Pro' ? '/contact' : '/app/auth/register'}
                  className={`block w-full text-center py-3 px-4 text-sm font-semibold rounded-xl transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-accent-500 to-accent-600 text-white hover:from-accent-600 hover:to-accent-700'
                      : 'bg-bg-tertiary text-text-primary border border-border-primary hover:bg-bg-card-hover'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trading Fee Tiers */}
      <section className="py-24 bg-bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-sm font-medium text-accent-400 mb-4 block">TRADING FEES</span>
            <h2 className="text-3xl font-bold text-text-primary mb-4">
              Volume-based fee discounts
            </h2>
            <p className="text-text-secondary">
              Trade more, pay less. Your fee tier is based on your 30-day trading volume.
            </p>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-bg-tertiary">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-text-tertiary uppercase">
                    Tier
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-text-tertiary uppercase">
                    30-Day Volume
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-text-tertiary uppercase">
                    Maker Fee
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-text-tertiary uppercase">
                    Taker Fee
                  </th>
                </tr>
              </thead>
              <tbody>
                {tradingFees.map((fee, index) => (
                  <tr key={index} className="border-t border-border-primary">
                    <td className="px-6 py-4 text-sm font-medium text-text-primary">{fee.tier}</td>
                    <td className="px-6 py-4 text-sm text-text-secondary">{fee.volume}</td>
                    <td className="px-6 py-4 text-sm text-right font-mono text-success">
                      {fee.maker}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-mono text-text-primary">
                      {fee.taker}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-sm font-medium text-accent-400 mb-4 block">FAQ</span>
            <h2 className="text-3xl font-bold text-text-primary">Frequently asked questions</h2>
          </div>

          <div className="glass-card p-2">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-border-primary last:border-0">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex justify-between items-center p-4 text-left"
                >
                  <span className="text-sm font-medium text-text-primary">{faq.question}</span>
                  <svg
                    className={`w-5 h-5 text-text-tertiary transition-transform ${openFaq === index ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {openFaq === index && (
                  <div className="px-4 pb-4 text-sm text-text-secondary">{faq.answer}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
            Ready to start trading?
          </h2>
          <p className="text-lg text-text-secondary mb-10">
            Join millions of traders and start your crypto journey today.
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
