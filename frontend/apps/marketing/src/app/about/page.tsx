import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about CryptoX, our mission to democratize crypto trading, and the team behind the platform.',
};

const stats = [
  { value: '5M+', label: 'Users Worldwide' },
  { value: '$50B+', label: 'Trading Volume' },
  { value: '180+', label: 'Countries Served' },
  { value: '200+', label: 'Team Members' },
];

const values = [
  {
    icon: '🎯',
    title: 'User First',
    description: 'Every decision we make starts with how it will impact our users. Your success is our success.',
  },
  {
    icon: '🔒',
    title: 'Security Always',
    description: 'We never compromise on security. Your assets and data are protected by industry-leading measures.',
  },
  {
    icon: '💡',
    title: 'Innovation',
    description: 'We continuously push the boundaries of what\'s possible in crypto trading technology.',
  },
  {
    icon: '🤝',
    title: 'Transparency',
    description: 'We believe in open communication, clear policies, and honest practices.',
  },
];

const team = [
  { name: 'Alex Chen', role: 'CEO & Co-Founder', avatar: 'AC' },
  { name: 'Sarah Williams', role: 'CTO & Co-Founder', avatar: 'SW' },
  { name: 'Michael Park', role: 'CFO', avatar: 'MP' },
  { name: 'Emily Zhang', role: 'Head of Product', avatar: 'EZ' },
  { name: 'David Torres', role: 'Head of Security', avatar: 'DT' },
  { name: 'Lisa Johnson', role: 'Head of Compliance', avatar: 'LJ' },
];

const milestones = [
  { year: '2021', title: 'Founded', description: 'CryptoX was born with a vision to make crypto trading accessible to everyone.' },
  { year: '2022', title: 'Series A', description: 'Raised $25M to expand our platform and team.' },
  { year: '2023', title: '1M Users', description: 'Reached our first million users milestone.' },
  { year: '2024', title: 'Global Expansion', description: 'Launched in 50+ new countries with localized support.' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-sm font-medium text-accent-400 mb-4 block">ABOUT US</span>
              <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-6">
                Building the future of <span className="text-gradient">crypto trading</span>
              </h1>
              <p className="text-xl text-text-secondary mb-8">
                CryptoX is on a mission to democratize access to cryptocurrency trading. We believe everyone should have the tools and knowledge to participate in the digital economy.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/careers"
                  className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl hover:from-accent-600 hover:to-accent-700 transition-all"
                >
                  Join Our Team
                </Link>
                <Link
                  href="/contact"
                  className="px-6 py-3 text-sm font-semibold text-text-primary bg-bg-card border border-border-primary rounded-xl hover:bg-bg-card-hover transition-all"
                >
                  Contact Us
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="glass-card p-6 text-center">
                  <div className="text-3xl font-bold text-gradient mb-1">{stat.value}</div>
                  <div className="text-sm text-text-tertiary">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-24 bg-bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-sm font-medium text-accent-400 mb-4 block">OUR MISSION</span>
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
            Empowering the world to trade crypto with confidence
          </h2>
          <p className="text-lg text-text-secondary">
            We're building more than just an exchange. We're creating an ecosystem where traders of all levels can learn, grow, and succeed. Through innovative technology, world-class security, and exceptional support, we're making crypto trading accessible, safe, and enjoyable for everyone.
          </p>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-accent-400 mb-4 block">OUR VALUES</span>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary">
              What we stand for
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <div key={index} className="glass-card p-6 text-center">
                <div className="text-4xl mb-4">{value.icon}</div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">{value.title}</h3>
                <p className="text-sm text-text-secondary">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-24 bg-bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-accent-400 mb-4 block">OUR JOURNEY</span>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary">
              Milestones along the way
            </h2>
          </div>

          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-border-primary" />
            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <div key={index} className={`relative flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-1/2 ${index % 2 === 0 ? 'pr-12 text-right' : 'pl-12'}`}>
                    <div className="glass-card p-6 inline-block">
                      <div className="text-accent-400 font-bold mb-1">{milestone.year}</div>
                      <h3 className="text-lg font-semibold text-text-primary mb-1">{milestone.title}</h3>
                      <p className="text-sm text-text-secondary">{milestone.description}</p>
                    </div>
                  </div>
                  <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-accent-500 rounded-full border-4 border-bg-secondary" />
                  <div className="w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-accent-400 mb-4 block">LEADERSHIP</span>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Meet our team
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              A diverse team of experts in crypto, fintech, and security working together to build the best trading platform.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {team.map((member, index) => (
              <div key={index} className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center text-xl font-bold text-white">
                  {member.avatar}
                </div>
                <h3 className="text-sm font-semibold text-text-primary">{member.name}</h3>
                <p className="text-xs text-text-tertiary">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
            Want to be part of our story?
          </h2>
          <p className="text-lg text-text-secondary mb-10">
            We're always looking for talented individuals to join our team.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/careers"
              className="px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl hover:from-accent-600 hover:to-accent-700 shadow-lg transition-all"
            >
              View Open Positions
            </Link>
            <Link
              href="/contact"
              className="px-8 py-4 text-base font-semibold text-text-primary bg-bg-card border border-border-primary rounded-xl hover:bg-bg-card-hover transition-all"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
