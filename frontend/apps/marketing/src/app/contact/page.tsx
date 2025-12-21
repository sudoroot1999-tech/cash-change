'use client';

import { useState } from 'react';
import Link from 'next/link';

const contactReasons = [
  'General Inquiry',
  'Technical Support',
  'Business Partnership',
  'Press & Media',
  'Bug Report',
  'Feature Request',
];

const offices = [
  {
    city: 'Singapore',
    address: '1 Raffles Place, Tower 2',
    country: 'Singapore 048616',
    email: 'asia@cryptox.exchange',
  },
  {
    city: 'London',
    address: '30 St Mary Axe',
    country: 'London EC3A 8EP, UK',
    email: 'europe@cryptox.exchange',
  },
  {
    city: 'New York',
    address: '350 Fifth Avenue',
    country: 'New York, NY 10118',
    email: 'americas@cryptox.exchange',
  },
];

const supportChannels = [
  {
    icon: '💬',
    title: 'Live Chat',
    description: 'Chat with our support team 24/7',
    action: 'Start Chat',
  },
  {
    icon: '📧',
    title: 'Email Support',
    description: 'support@cryptox.exchange',
    action: 'Send Email',
  },
  {
    icon: '📖',
    title: 'Help Center',
    description: 'Find answers in our knowledge base',
    action: 'Browse Articles',
  },
  {
    icon: '🐦',
    title: 'Twitter',
    description: '@CryptoXExchange',
    action: 'Follow Us',
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    reason: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-sm font-medium text-accent-400 mb-4 block">CONTACT</span>
          <h1 className="text-4xl md:text-6xl font-bold text-text-primary mb-6">
            Get in touch
          </h1>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Have a question or need help? Our team is here to assist you.
          </p>
        </div>
      </section>

      {/* Support Channels */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {supportChannels.map((channel, index) => (
              <button key={index} className="glass-card p-6 text-left hover:scale-[1.02] transition-transform">
                <div className="text-3xl mb-4">{channel.icon}</div>
                <h3 className="text-lg font-semibold text-text-primary mb-1">{channel.title}</h3>
                <p className="text-sm text-text-secondary mb-4">{channel.description}</p>
                <span className="text-sm font-medium text-accent-400">{channel.action} →</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Form */}
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-6">Send us a message</h2>
              
              {submitted ? (
                <div className="glass-card p-8 text-center">
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="text-xl font-bold text-text-primary mb-2">Message Sent!</h3>
                  <p className="text-text-secondary mb-6">
                    Thank you for contacting us. We'll get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({ name: '', email: '', reason: '', subject: '', message: '' });
                    }}
                    className="px-6 py-2 text-sm font-medium text-accent-400 hover:underline"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 text-sm bg-bg-card border border-border-primary rounded-xl focus:outline-none focus:border-accent-500 text-text-primary"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 text-sm bg-bg-card border border-border-primary rounded-xl focus:outline-none focus:border-accent-500 text-text-primary"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Reason for Contact *
                    </label>
                    <select
                      required
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      className="w-full px-4 py-3 text-sm bg-bg-card border border-border-primary rounded-xl focus:outline-none focus:border-accent-500 text-text-primary"
                    >
                      <option value="">Select a reason</option>
                      {contactReasons.map((reason, index) => (
                        <option key={index} value={reason}>{reason}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Subject *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 text-sm bg-bg-card border border-border-primary rounded-xl focus:outline-none focus:border-accent-500 text-text-primary"
                      placeholder="Brief subject line"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Message *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3 text-sm bg-bg-card border border-border-primary rounded-xl focus:outline-none focus:border-accent-500 text-text-primary resize-none"
                      placeholder="Tell us more about your inquiry..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl hover:from-accent-600 hover:to-accent-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>

            {/* Office Locations */}
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-6">Our Offices</h2>
              <div className="space-y-6">
                {offices.map((office, index) => (
                  <div key={index} className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-text-primary mb-2">{office.city}</h3>
                    <p className="text-sm text-text-secondary mb-1">{office.address}</p>
                    <p className="text-sm text-text-secondary mb-3">{office.country}</p>
                    <a href={`mailto:${office.email}`} className="text-sm font-medium text-accent-400 hover:underline">
                      {office.email}
                    </a>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-6 bg-bg-secondary rounded-xl">
                <h3 className="text-lg font-semibold text-text-primary mb-2">Business Hours</h3>
                <p className="text-sm text-text-secondary">
                  Our support team is available 24/7 for urgent matters. For general inquiries, we typically respond within 24 hours on business days.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Link */}
      <section className="py-24 bg-bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
            Looking for quick answers?
          </h2>
          <p className="text-lg text-text-secondary mb-8">
            Check out our FAQ section for answers to common questions.
          </p>
          <Link
            href="/#faq"
            className="inline-flex px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl hover:from-accent-600 hover:to-accent-700 shadow-lg transition-all"
          >
            View FAQ
          </Link>
        </div>
      </section>
    </div>
  );
}
