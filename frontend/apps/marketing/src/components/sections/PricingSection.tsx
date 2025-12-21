'use client';

import { useState } from 'react';
import Link from 'next/link';

const plans = [
  {
    name: 'Basic',
    price: { monthly: 4.99, annual: 3.99 },
    description: 'per user / month',
    features: ['1 project', 'Analytics', 'Insights Panel', 'Share Features'],
    cta: 'Start 30 Days Free Trial',
    popular: false,
  },
  {
    name: 'Degen',
    price: { monthly: 14.99, annual: 11.99 },
    description: 'per user / month',
    features: ['2 projects', 'Analytics', 'Insights Panel', 'Share Features', 'Priority Support'],
    cta: 'Start 30 Days Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: { monthly: 49.99, annual: 39.99 },
    description: "let's discuss with sales team",
    features: ['Unlimited Projects', 'Analytics', 'Insights Panel', 'Share Features', 'Dedicated Support', 'Custom Integrations'],
    cta: 'Chat With Us',
    popular: false,
  },
];

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section className="py-24 bg-bg-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-sm font-medium text-accent-400 mb-4 block">PRICING</span>
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            Comprehensive pricing overview
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-8">
            We understand the importance of productivity and efficiency in today's fast-paced world
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-2 p-1 bg-bg-tertiary rounded-lg">
            <button
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                !isAnnual ? 'bg-bg-elevated text-text-primary' : 'text-text-tertiary'
              }`}
              onClick={() => setIsAnnual(false)}
            >
              Monthly
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                isAnnual ? 'bg-bg-elevated text-text-primary' : 'text-text-tertiary'
              }`}
              onClick={() => setIsAnnual(true)}
            >
              Annual -20%
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`glass-card p-6 ${plan.popular ? 'pricing-highlight' : ''}`}
            >
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-text-primary">{plan.name}</h3>
                {plan.popular && (
                  <span className="text-xs text-accent-400">Most Preferred</span>
                )}
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-text-primary">
                  ${isAnnual ? plan.price.annual : plan.price.monthly}
                </span>
                <p className="text-sm text-text-tertiary mt-1">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-text-secondary">
                    <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="http://localhost:4200/auth/register"
                className={`block w-full text-center py-3 px-4 text-sm font-semibold rounded-xl transition-all ${
                  plan.popular
                    ? 'bg-gradient-to-r from-accent-500 to-accent-600 text-white hover:from-accent-600 hover:to-accent-700'
                    : 'bg-bg-tertiary text-text-primary border border-border-primary hover:bg-bg-elevated'
                }`}
              >
                {plan.cta}
              </Link>

              {!plan.popular && (
                <p className="text-center text-xs text-text-tertiary mt-3">
                  No credit card required*
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
