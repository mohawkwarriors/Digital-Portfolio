import React, { useState } from 'react';
import { 
  MapPin, 
  Github, 
  Linkedin, 
  Twitter, 
  ExternalLink,
  Mail,
  Compass,
  Copy,
  Check,
  FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { Profile } from '../types';

interface HeroProps {
  profile: Profile;
  onOpenResume?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ profile, onOpenResume }) => {
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(profile.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2200);
  };

  return (
    <section 
      id="hero-section" 
      className="pt-20 pb-12 md:pt-24 md:pb-16 relative border-b border-stone-200 dark:border-stone-800 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 space-y-12">
        {/* Intro */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center"
        >
          <div className="md:col-span-8 space-y-6">
            {profile.location && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-mono text-stone-600 dark:text-stone-400">
                <MapPin className="w-3.5 h-3.5" />
                <span>{profile.location}</span>
              </div>
            )}

            <div className="space-y-4">
              <h1 id="hero-name-heading" className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
                {profile.name}
              </h1>
              <p id="hero-title-subheading" className="text-xl sm:text-2xl text-stone-600 dark:text-stone-400 font-medium tracking-tight">
                {profile.title} <span className="text-stone-300 dark:text-stone-700 mx-2">|</span> {profile.tagline}
              </p>
              <p id="hero-bio" className="text-base sm:text-lg text-stone-500 dark:text-stone-400 max-w-2xl leading-relaxed">
                {profile.bio}
              </p>
            </div>
          </div>
          
          <div className="md:col-span-4 flex flex-col items-start md:items-end">
            {/* Mobile: Larger headshot side-by-side with balanced touch buttons; Desktop: Full stacked */}
            <div className="flex flex-row md:flex-col items-center md:items-end gap-4 sm:gap-6 md:gap-5 w-full md:w-auto">
              {/* Headshot */}
              <div className="relative w-40 h-40 min-[375px]:w-44 min-[375px]:h-44 sm:w-52 sm:h-52 md:w-64 md:h-64 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-sm bg-stone-100 dark:bg-stone-900 shrink-0">
                <img 
                  src={profile.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop"} 
                  alt={profile.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10 rounded-2xl"></div>
              </div>

              {/* Links & Contact: Ergonomic touch-target buttons, balanced spacing */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex-1 max-w-[140px] sm:max-w-[160px] md:max-w-none md:w-64 flex flex-col gap-2.5 sm:gap-3 justify-center shrink-0"
              >
                <button 
                  type="button"
                  id="hero-resume-btn"
                  onClick={() => {
                    if (onOpenResume) {
                      onOpenResume();
                    } else if (profile.resumeUrl) {
                      window.open(profile.resumeUrl, '_blank');
                    }
                  }}
                  className="w-full h-11 inline-flex items-center justify-center gap-2 px-3 md:px-4 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl text-xs md:text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors shadow-2xs cursor-pointer whitespace-nowrap active:scale-98"
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>Resume</span>
                </button>

                <div className="grid grid-cols-2 gap-2 sm:gap-2.5 md:gap-3">
                  <a 
                    href={profile.github} 
                    target="_blank" 
                    rel="noreferrer" 
                    id="hero-github-link"
                    aria-label="GitHub Profile"
                    title="GitHub Profile"
                    className="h-11 inline-flex items-center justify-center gap-2 px-2.5 md:px-4 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs md:text-sm font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shadow-2xs active:scale-98"
                  >
                    <Github className="w-4 h-4 shrink-0" />
                    <span className="hidden md:inline">GitHub</span>
                  </a>
                  
                  <a 
                    href={profile.linkedin} 
                    target="_blank" 
                    rel="noreferrer" 
                    id="hero-linkedin-link"
                    aria-label="LinkedIn Profile"
                    title="LinkedIn Profile"
                    className="h-11 inline-flex items-center justify-center gap-2 px-2.5 md:px-4 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs md:text-sm font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shadow-2xs active:scale-98"
                  >
                    <Linkedin className="w-4 h-4 shrink-0" />
                    <span className="hidden md:inline">LinkedIn</span>
                  </a>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Minimalist Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className={`grid grid-cols-2 ${
            profile.stats.length === 1 ? 'md:grid-cols-1' :
            profile.stats.length === 2 ? 'md:grid-cols-2' :
            profile.stats.length === 3 ? 'md:grid-cols-3' :
            profile.stats.length === 4 ? 'md:grid-cols-4' :
            profile.stats.length === 5 ? 'md:grid-cols-5' :
            'md:grid-cols-4 lg:grid-cols-6'
          } gap-6 py-8 border-y border-stone-200 dark:border-stone-800`}
        >
          {profile.stats.map((stat, idx) => (
            <div key={idx} className="space-y-1">
              <div className="text-3xl font-bold text-stone-900 dark:text-stone-100 font-mono">{stat.value}</div>
              <div className="text-sm text-stone-500 dark:text-stone-400">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
