'use client';

import { useState } from 'react';

const faqs = [
  {
    question: 'How do I get started with CryptoX?',
    answer: 'Getting started is easy! Simply create an account, complete the verification process, and you can start trading within minutes. We offer comprehensive guides and 24/7 support to help you every step of the way.',
  },
  {
    question: 'What security measures does CryptoX use?',
    answer: 'We employ bank-grade security including 256-bit encryption, multi-factor authentication, cold storage for 95% of assets, and regular security audits. Your assets are protected by industry-leading security protocols.',
  },
  {
    question: 'What are the trading fees?',
    answer: 'Our fees are competitive and transparent. Maker fees start at 0.1% and taker fees at 0.15%. High-volume traders enjoy reduced fees, and holding our native token provides additional discounts.',
  },
  {
    question: 'How do I deposit and withdraw funds?',
    answer: 'You can deposit cryptocurrencies directly to your wallet address or use bank transfer, credit card, or other supported payment methods. Withdrawals are processed quickly with most completed within 24 hours.',
  },
  {
    question: 'Is customer support available 24/7?',
    answer: 'Yes! Our support team is available around the clock via live chat, email, and phone. We also have an extensive help center with guides, tutorials, and frequently asked questions.',
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 bg-bg-secondary">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-sm font-medium text-accent-400 mb-4 block">FAQ</span>
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-text-secondary">
            Everything you need to know about CryptoX
          </p>
        </div>

        <div className="glass-card p-2">
          {faqs.map((faq, index) => (
            <div key={index} className="faq-item">
              <button
                className="faq-trigger"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span>{faq.question}</span>
                <svg
                  className={`w-5 h-5 text-text-tertiary transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === index && (
                <div className="faq-content">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
