import React, { useState } from 'react';
import { ArrowUp, Github, Linkedin, Mail, Briefcase, Wrench, Lock } from 'lucide-react';
import { Profile } from '../types';

interface FooterProps {
  profile: Profile;
  onOpenEdit: () => void;
  isAuthorized?: boolean;
  onLockAuth?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ 
  profile, 
  onOpenEdit, 
  isAuthorized = false, 
  onLockAuth 
}) => {
  const [clickCount, setClickCount] = useState(0);
  const [showEdit, setShowEdit] = useState(false);

  const handleNameClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    if (newCount >= 3) {
      setShowEdit(true);
      onOpenEdit();
      // reset click count so it can be triggered again if closed
      setClickCount(0); 
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer id="portfolio-footer" className="bg-stone-50/70 text-stone-500 py-12 border-t border-stone-200/80 text-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-stone-200/80">
          {/* Brand & Tagline */}
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span 
                className="font-semibold text-stone-900 tracking-tight text-sm sm:text-base cursor-default select-none"
                onClick={handleNameClick}
              >
                {profile.name}
              </span>
            </div>
          </div>

          {/* Social Links & Back to top */}
          <div className="flex items-center gap-2">
            <a
              href={profile.github}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub Profile"
              className="p-2 rounded-lg bg-white hover:bg-stone-100 text-stone-600 hover:text-stone-900 border border-stone-200/80 transition-colors shadow-2xs"
            >
              <Github className="w-3.5 h-3.5" />
            </a>
            <a
              href={profile.linkedin}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn Profile"
              className="p-2 rounded-lg bg-white hover:bg-stone-100 text-stone-600 hover:text-stone-900 border border-stone-200/80 transition-colors shadow-2xs"
            >
              <Linkedin className="w-3.5 h-3.5" />
            </a>
            <a
              href={`mailto:${profile.email}`}
              aria-label="Send Email"
              className="p-2 rounded-lg bg-white hover:bg-stone-100 text-stone-600 hover:text-stone-900 border border-stone-200/80 transition-colors shadow-2xs"
            >
              <Mail className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={scrollToTop}
              id="footer-back-to-top"
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-700 hover:text-stone-900 font-medium border border-stone-200/80 transition-colors shadow-2xs ml-2"
            >
              <span>Top</span>
              <ArrowUp className="w-3.5 h-3.5 text-stone-400" />
            </button>
          </div>
        </div>

        {/* Bottom meta row */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-end gap-4 text-stone-400 font-mono text-[11px]">
          <div className="flex items-center gap-3 text-stone-400">
            {showEdit && (
              <>
                <button
                  onClick={onOpenEdit}
                  id="footer-owner-edit-btn"
                  type="button"
                  title="Edit portfolio (Owner access)"
                  className="inline-flex items-center gap-1 text-stone-400 hover:text-stone-700 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-stone-400 rounded px-1 -mx-1"
                >
                  <Wrench className="w-3 h-3 text-stone-400" />
                  <span>edit</span>
                </button>
                {isAuthorized && onLockAuth && (
                  <>
                    <span>•</span>
                    <button
                      onClick={onLockAuth}
                      id="footer-lock-btn"
                      type="button"
                      title="Lock editor (Switch to visitor view)"
                      className="inline-flex items-center gap-1 text-stone-400 hover:text-stone-700 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-stone-400 rounded px-1 -mx-1"
                    >
                      <Lock className="w-3 h-3 text-stone-400" />
                      <span>lock</span>
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
