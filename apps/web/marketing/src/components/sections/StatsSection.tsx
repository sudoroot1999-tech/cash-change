const stats = [
  { value: '124K+', label: 'Active Users' },
  { value: '5.67B+', label: 'Trading Volume' },
  { value: '982.15M+', label: 'Processed Transactions' },
  { value: '42.16M+', label: 'Assets Secured' },
];

export function StatsSection() {
  return (
    <section className="py-16 bg-bg-secondary border-y border-border-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-sm font-medium text-accent-400 mb-4 block">NUMBERS</span>
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary">
            Discover Our Success Stories
          </h2>
          <p className="text-lg text-text-secondary mt-4 max-w-2xl mx-auto">
            Discover our milestones and successes that demonstrate our commitment to excellence and innovation.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center stat-counter" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="text-4xl md:text-5xl font-bold text-gradient mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-text-tertiary">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
