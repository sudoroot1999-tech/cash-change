'use client';

import Link from 'next/link';
import { useState } from 'react';

const navItems = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Blog', href: '/blog' },
  { label: 'About', href: '/about' },
  { label: 'Careers', href: '/careers' },
  { label: 'Contact', href: '/contact' },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-bg-secondary/80 backdrop-blur-xl border-b border-border-primary">
      {/* Announcement Banner */}
      <div className="bg-gradient-to-r from-accent-600 to-accent-500 text-center py-2 px-4">
        <p className="text-sm text-white">
          🚀 V2.0 is here! Experience the new trading interface.{' '}
          <Link href="/features" className="underline font-medium">
            Learn more
          </Link>
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-accent-500 to-accent-600 rounded-lg flex items-center justify-center text-xs font-bold text-white">
              CX
            </div>
            <span className="text-lg font-bold text-text-primary">CryptoX</span>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-medium bg-bg-tertiary text-text-tertiary rounded">
              V2.0
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-card transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="http://localhost:4200/app/auth/login"
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Login
            </Link>
            <Link
              href="http://localhost:4200/auth/register"
              className="px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-accent-500 to-accent-600 rounded-lg hover:from-accent-600 hover:to-accent-700 shadow-md hover:shadow-lg transition-all"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-text-primary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border-primary">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 text-base font-medium text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-card"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border-primary">
                <Link
                  href="http://localhost:4200/app/auth/login"
                  className="px-3 py-2 text-base font-medium text-text-secondary"
                >
                  Login
                </Link>
                <Link
                  href="http://localhost:4200/auth/register"
                  className="px-4 py-2.5 text-center text-sm font-medium text-white bg-gradient-to-r from-accent-500 to-accent-600 rounded-lg"
                >
                  Get Started
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
