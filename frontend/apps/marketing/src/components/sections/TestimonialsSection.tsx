const testimonials = [
  {
    content: "CryptoX has transformed how I trade. The interface is intuitive and the execution speed is unmatched.",
    author: "Sarah Chen",
    role: "Professional Trader",
    avatar: "SC",
  },
  {
    content: "Best crypto exchange I've used. The security features give me peace of mind with every transaction.",
    author: "Michael Torres",
    role: "Crypto Investor",
    avatar: "MT",
  },
  {
    content: "The analytics and insights have helped me make better trading decisions. Highly recommended!",
    author: "Emma Williams",
    role: "DeFi Enthusiast",
    avatar: "EW",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-sm font-medium text-accent-400 mb-4 block">TESTIMONIALS</span>
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            User insights, authentic experiences
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            See what our users are saying about their experience with CryptoX
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="glass-card p-6">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-warning" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              
              <p className="text-text-secondary mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center text-sm font-semibold text-white">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{testimonial.author}</p>
                  <p className="text-xs text-text-tertiary">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
