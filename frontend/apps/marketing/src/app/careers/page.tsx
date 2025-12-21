import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Careers',
  description: 'Join the CryptoX team. Explore exciting career opportunities in crypto, fintech, and blockchain technology.',
};

const benefits = [
  { icon: '🏠', title: 'Remote First', description: 'Work from anywhere in the world' },
  { icon: '💰', title: 'Competitive Pay', description: 'Salary + equity + crypto bonus' },
  { icon: '🏥', title: 'Health & Wellness', description: 'Medical, dental, vision coverage' },
  { icon: '🎯', title: 'Career Growth', description: 'Learning budget & mentorship' },
  { icon: '🏖️', title: 'Unlimited PTO', description: 'Take the time you need' },
  { icon: '🖥️', title: 'Home Office', description: '$2,000 setup allowance' },
];

const departments = [
  { name: 'Engineering', count: 8 },
  { name: 'Product', count: 3 },
  { name: 'Design', count: 2 },
  { name: 'Security', count: 2 },
  { name: 'Marketing', count: 2 },
  { name: 'Operations', count: 3 },
];

const openPositions = [
  {
    title: 'Senior Backend Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    description: 'Build and scale our core trading infrastructure using Go, Rust, and TypeScript.',
  },
  {
    title: 'Frontend Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    description: 'Create beautiful, high-performance trading interfaces with React and Angular.',
  },
  {
    title: 'Blockchain Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    description: 'Integrate new blockchains and develop smart contract solutions.',
  },
  {
    title: 'Security Engineer',
    department: 'Security',
    location: 'Remote',
    type: 'Full-time',
    description: 'Protect our platform and users with cutting-edge security measures.',
  },
  {
    title: 'Product Designer',
    department: 'Design',
    location: 'Remote',
    type: 'Full-time',
    description: 'Design intuitive trading experiences for millions of users.',
  },
  {
    title: 'Product Manager',
    department: 'Product',
    location: 'Remote',
    type: 'Full-time',
    description: 'Drive product strategy and work with cross-functional teams to deliver features.',
  },
  {
    title: 'Growth Marketing Manager',
    department: 'Marketing',
    location: 'Remote',
    type: 'Full-time',
    description: 'Lead user acquisition and growth initiatives across global markets.',
  },
  {
    title: 'Customer Success Lead',
    department: 'Operations',
    location: 'Singapore',
    type: 'Full-time',
    description: 'Build and lead our customer success team in the APAC region.',
  },
];

export default function CareersPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-sm font-medium text-accent-400 mb-4 block">CAREERS</span>
          <h1 className="text-4xl md:text-6xl font-bold text-text-primary mb-6">
            Build the future of <span className="text-gradient">finance</span>
          </h1>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto mb-10">
            Join our mission to make crypto trading accessible to everyone. We're looking for passionate people to help us reshape the financial landscape.
          </p>
          <a
            href="#positions"
            className="inline-flex px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl hover:from-accent-600 hover:to-accent-700 shadow-lg transition-all"
          >
            View Open Positions
          </a>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-accent-400 mb-4 block">BENEFITS</span>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Why you'll love working here
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              We offer competitive compensation and benefits to help you do your best work.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="glass-card p-6">
                <div className="text-3xl mb-4">{benefit.icon}</div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">{benefit.title}</h3>
                <p className="text-sm text-text-secondary">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Culture */}
      <section className="py-24 bg-bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-sm font-medium text-accent-400 mb-4 block">OUR CULTURE</span>
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
                A team that moves fast and ships often
              </h2>
              <p className="text-lg text-text-secondary mb-6">
                We believe in small, autonomous teams that can make decisions quickly. We value ownership, transparency, and continuous learning.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-success mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-text-secondary">Weekly ship days with real user impact</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-success mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-text-secondary">Quarterly team offsites around the world</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-success mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-text-secondary">Open-source contributions encouraged</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-success mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-text-secondary">No politics, just great work</span>
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-6 text-center">
                <div className="text-3xl font-bold text-gradient mb-1">40+</div>
                <div className="text-sm text-text-tertiary">Countries</div>
              </div>
              <div className="glass-card p-6 text-center">
                <div className="text-3xl font-bold text-gradient mb-1">200+</div>
                <div className="text-sm text-text-tertiary">Team Members</div>
              </div>
              <div className="glass-card p-6 text-center">
                <div className="text-3xl font-bold text-gradient mb-1">30+</div>
                <div className="text-sm text-text-tertiary">Languages</div>
              </div>
              <div className="glass-card p-6 text-center">
                <div className="text-3xl font-bold text-gradient mb-1">24/7</div>
                <div className="text-sm text-text-tertiary">Coverage</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section id="positions" className="py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-sm font-medium text-accent-400 mb-4 block">OPEN POSITIONS</span>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Find your next adventure
            </h2>
            <p className="text-lg text-text-secondary">
              We have {openPositions.length} open positions across {departments.length} departments.
            </p>
          </div>

          {/* Department Filter */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            <button className="px-4 py-2 text-sm font-medium bg-accent-500 text-white rounded-lg">
              All ({openPositions.length})
            </button>
            {departments.map((dept, index) => (
              <button key={index} className="px-4 py-2 text-sm font-medium bg-bg-card text-text-secondary rounded-lg hover:bg-bg-card-hover">
                {dept.name} ({dept.count})
              </button>
            ))}
          </div>

          {/* Position Cards */}
          <div className="space-y-4">
            {openPositions.map((position, index) => (
              <div key={index} className="glass-card p-6 hover:scale-[1.01] transition-transform cursor-pointer">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary mb-1">{position.title}</h3>
                    <p className="text-sm text-text-secondary mb-2">{position.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 text-xs font-medium bg-bg-tertiary text-text-tertiary rounded">
                        {position.department}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-bg-tertiary text-text-tertiary rounded">
                        {position.location}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-bg-tertiary text-text-tertiary rounded">
                        {position.type}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Link
                      href={`/careers/${position.title.toLowerCase().replace(/\s+/g, '-')}`}
                      className="inline-flex px-4 py-2 text-sm font-medium text-accent-400 bg-accent-500/10 rounded-lg hover:bg-accent-500/20 transition-colors"
                    >
                      Apply Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
            Don't see the right role?
          </h2>
          <p className="text-lg text-text-secondary mb-10">
            We're always looking for talented people. Send us your resume and we'll reach out when something opens up.
          </p>
          <Link
            href="/contact"
            className="inline-flex px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl hover:from-accent-600 hover:to-accent-700 shadow-lg transition-all"
          >
            Get in Touch
          </Link>
        </div>
      </section>
    </div>
  );
}
