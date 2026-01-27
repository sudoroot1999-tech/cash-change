export function TrustedBySection() {
  const logos = [
    'Polygon', 'Ethereum', 'Solana', 'Bitcoin', 'Avalanche', 'Arbitrum'
  ];

  return (
    <section className="py-12 border-y border-border-primary bg-bg-secondary/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-text-tertiary mb-8">
          Trusted by leading blockchain protocols
        </p>
        
        <div className="flex overflow-hidden">
          <div className="flex gap-12 marquee">
            {[...logos, ...logos].map((logo, i) => (
              <div 
                key={i}
                className="flex items-center gap-2 text-text-tertiary hover:text-text-secondary transition-colors"
              >
                <div className="w-8 h-8 bg-bg-tertiary rounded-lg flex items-center justify-center">
                  <span className="text-xs font-bold">{logo.charAt(0)}</span>
                </div>
                <span className="font-medium whitespace-nowrap">{logo}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
