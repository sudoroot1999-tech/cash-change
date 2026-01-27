const features = [
  {
    icon: '🔒',
    title: 'Robust Security',
    description: 'Advanced security protocols to protect your data and transactions.',
  },
  {
    icon: '📈',
    title: 'Scalable Solutions',
    description: 'Flexible and scalable solutions to grow with your needs.',
  },
  {
    icon: '✨',
    title: 'User-Friendly Interface',
    description: 'Intuitive design for seamless navigation and usage.',
  },
  {
    icon: '🔐',
    title: 'End-to-End Encryption',
    description: 'Secure all communications with strong encryption methods.',
  },
  {
    icon: '🛡️',
    title: 'Multi-Factor Authentication',
    description: 'Add extra layers of security to protect user accounts.',
  },
  {
    icon: '⚡',
    title: 'Instant Transactions',
    description: 'Experience lightning-fast transactions powered by blockchain.',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-sm font-medium text-accent-400 mb-4 block">FEATURES</span>
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            Our Key Features
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Explore the core features that make our platform stand out. Each element is designed to enhance your experience and streamline your operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="feature-card glass-card p-6 cursor-pointer"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-text-secondary">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
