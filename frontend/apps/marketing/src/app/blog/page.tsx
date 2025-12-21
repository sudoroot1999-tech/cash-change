import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Stay updated with the latest crypto news, trading strategies, market analysis, and platform updates from CryptoX.',
};

const featuredPost = {
  title: 'The Future of Decentralized Finance: What to Expect in 2025',
  excerpt: 'Explore the emerging trends in DeFi and how they will reshape the financial landscape in the coming year.',
  author: 'Sarah Chen',
  role: 'Head of Research',
  date: 'Dec 20, 2024',
  readTime: '8 min read',
  category: 'DeFi',
  image: '🎯',
};

const categories = ['All', 'Market Analysis', 'Trading Strategies', 'DeFi', 'News', 'Tutorials'];

const blogPosts = [
  {
    title: 'Understanding Crypto Market Cycles: Bull vs Bear Markets',
    excerpt: 'Learn to identify market phases and adjust your trading strategy accordingly.',
    author: 'Michael Torres',
    date: 'Dec 18, 2024',
    readTime: '6 min read',
    category: 'Market Analysis',
    icon: '📈',
  },
  {
    title: 'Top 10 Technical Indicators Every Trader Should Know',
    excerpt: 'Master these essential indicators to improve your trading decisions.',
    author: 'Emma Williams',
    date: 'Dec 15, 2024',
    readTime: '10 min read',
    category: 'Trading Strategies',
    icon: '📊',
  },
  {
    title: 'Yield Farming 101: A Beginner\'s Complete Guide',
    excerpt: 'Everything you need to know to start earning passive income through DeFi.',
    author: 'David Park',
    date: 'Dec 12, 2024',
    readTime: '12 min read',
    category: 'DeFi',
    icon: '🌾',
  },
  {
    title: 'CryptoX Platform Update: New Features Released',
    excerpt: 'Introducing advanced order types, improved charting, and mobile app enhancements.',
    author: 'CryptoX Team',
    date: 'Dec 10, 2024',
    readTime: '4 min read',
    category: 'News',
    icon: '🚀',
  },
  {
    title: 'How to Set Up Two-Factor Authentication',
    excerpt: 'Step-by-step guide to securing your account with 2FA.',
    author: 'Security Team',
    date: 'Dec 8, 2024',
    readTime: '5 min read',
    category: 'Tutorials',
    icon: '🔐',
  },
  {
    title: 'Bitcoin Halving 2024: Impact on Prices and Mining',
    excerpt: 'Analyzing the effects of the latest halving event on the crypto ecosystem.',
    author: 'Sarah Chen',
    date: 'Dec 5, 2024',
    readTime: '7 min read',
    category: 'Market Analysis',
    icon: '₿',
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-sm font-medium text-accent-400 mb-4 block">BLOG</span>
          <h1 className="text-4xl md:text-6xl font-bold text-text-primary mb-6">
            Insights & Education
          </h1>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Stay informed with the latest crypto news, trading strategies, and market analysis from our expert team.
          </p>
        </div>
      </section>

      {/* Featured Post */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/blog/future-of-defi-2025" className="block glass-card overflow-hidden group">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
              <div className="flex flex-col justify-center">
                <span className="inline-flex px-3 py-1 text-xs font-medium text-accent-400 bg-accent-500/10 rounded-full w-fit mb-4">
                  {featuredPost.category}
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4 group-hover:text-accent-400 transition-colors">
                  {featuredPost.title}
                </h2>
                <p className="text-text-secondary mb-6">{featuredPost.excerpt}</p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center text-sm font-bold text-white">
                    {featuredPost.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{featuredPost.author}</p>
                    <p className="text-xs text-text-tertiary">{featuredPost.date} · {featuredPost.readTime}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center bg-bg-tertiary rounded-xl">
                <span className="text-8xl">{featuredPost.image}</span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((category, index) => (
              <button
                key={index}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  index === 0 
                    ? 'bg-accent-500 text-white' 
                    : 'bg-bg-card text-text-secondary hover:bg-bg-card-hover'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogPosts.map((post, index) => (
              <Link key={index} href={`/blog/${post.title.toLowerCase().replace(/\s+/g, '-')}`} className="glass-card overflow-hidden group">
                <div className="h-40 bg-bg-tertiary flex items-center justify-center">
                  <span className="text-5xl">{post.icon}</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 text-xs font-medium text-accent-400 bg-accent-500/10 rounded-full">
                      {post.category}
                    </span>
                    <span className="text-xs text-text-tertiary">{post.readTime}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-accent-400 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-text-secondary mb-4 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-bg-tertiary flex items-center justify-center text-xs font-bold text-text-tertiary">
                      {post.author.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-xs text-text-tertiary">{post.author}</span>
                    <span className="text-xs text-text-muted">·</span>
                    <span className="text-xs text-text-tertiary">{post.date}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-24 bg-bg-secondary">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
            Subscribe to our newsletter
          </h2>
          <p className="text-text-secondary mb-8">
            Get the latest crypto insights delivered to your inbox weekly.
          </p>
          <form className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 text-sm bg-bg-card border border-border-primary rounded-xl focus:outline-none focus:border-accent-500 text-text-primary"
            />
            <button
              type="submit"
              className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl hover:from-accent-600 hover:to-accent-700 transition-all"
            >
              Subscribe
            </button>
          </form>
          <p className="text-xs text-text-tertiary mt-4">
            No spam. Unsubscribe at any time.
          </p>
        </div>
      </section>
    </div>
  );
}
