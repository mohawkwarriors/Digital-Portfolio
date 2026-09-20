import React, { useState, useEffect } from 'react';
import { Briefcase, FolderGit2, Mail, Layers, Menu, X, ArrowUpRight, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';
import { Profile } from '../types';
import { getCurrentEnvironment } from '../utils/firebase';

interface NavbarProps {
  profile: Profile;
}

export const Navbar: React.FC<NavbarProps> = ({ profile }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Experience', href: '#experience', icon: Briefcase },
    { label: 'Projects', href: '#projects', icon: FolderGit2 },
    { label: 'Skills', href: '#skills', icon: Layers },
    { label: 'Contact', href: '#overview-contact', icon: Mail },
  ];

  return (
    <header
      id="main-navigation"
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-200 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md text-stone-900 border-b border-stone-200/80 shadow-2xs'
          : 'bg-stone-50/80 backdrop-blur-sm text-stone-900 border-b border-stone-200/60'
      }`}
    >
      {/* Precision Scroll Progress Bar */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-[2px] bg-stone-900 origin-left z-50 pointer-events-none"
        style={{ scaleX }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo / Monogram */}
        <a
          href="#"
          id="nav-brand-link"
          className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 rounded-lg p-1"
        >
          <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center font-bold text-xs group-hover:bg-stone-800 transition-colors shadow-2xs group-hover:scale-105 transition-transform duration-200">
            <span className="font-mono tracking-tight">
              {profile.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-stone-900 group-hover:text-stone-600 transition-colors">
                {profile.name}
              </span>
              {getCurrentEnvironment() === 'staging' && (
                <span 
                  title="Testing & Development Preview. Production site is protected from edits made here."
                  className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300/80 shadow-2xs"
                >
                  Staging
                </span>
              )}
            </div>
            <span className="text-[11px] text-stone-400 hidden sm:inline-block font-mono">
              Product Design Engineering
            </span>
          </div>
        </a>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.href}
                href={link.href}
                id={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                className="px-3 py-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100/80 transition-all flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 active:scale-95"
              >
                <Icon className="w-3.5 h-3.5 text-stone-400" />
                <span>{link.label}</span>
              </a>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Primary CTA */}
          <a
            href="#contact"
            id="nav-contact-cta"
            className="inline-flex items-center gap-1 text-xs font-medium px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white shadow-2xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 active:scale-[0.98]"
          >
            <span>Get in Touch</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            id="mobile-menu-toggle"
            type="button"
            aria-label="Toggle Navigation Menu"
            className="md:hidden p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden bg-white border-b border-stone-200 px-4 py-4 space-y-2 shadow-sm overflow-hidden"
          >
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-stone-700 hover:bg-stone-100 hover:text-stone-900 text-xs font-medium transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-stone-400" />
                    <span>{link.label}</span>
                  </div>
                </a>
              );
            })}
            <div className="pt-2 border-t border-stone-100">
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-stone-900 text-white text-xs font-medium hover:bg-stone-800"
              >
                <span>Get in Touch</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
