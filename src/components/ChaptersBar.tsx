import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';
import { User, Briefcase, Box, Wrench, Compass, FileText } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { SectionConfig } from '../types';

interface Chapter {
  id: string;
  type: string;
  num: string;
  label: string;
  shortLabel: string;
  targetId: string;
}

interface ChaptersBarProps {
  sections: SectionConfig[];
}

const getChapterIcon = (type: string, id: string) => {
  const key = `${type || ''} ${id || ''}`.toLowerCase();
  if (key.includes('hero') || key.includes('profile')) return User;
  if (key.includes('experience')) return Briefcase;
  if (key.includes('project')) return Box;
  if (key.includes('skill')) return Wrench;
  if (key.includes('resume')) return FileText;
  return Compass;
};

export const ChaptersBar: React.FC<ChaptersBarProps> = ({ sections }) => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 250,
    damping: 30,
    restDelta: 0.001
  });

  const chapters: Chapter[] = useMemo(() => {
    return sections.map((sec, idx) => ({
      id: sec.id,
      type: sec.type,
      num: String(idx + 1).padStart(2, '0'),
      label: sec.title,
      shortLabel: sec.title.length > 7 ? sec.title.substring(0, 6) + '…' : sec.title,
      targetId: sec.type === 'hero' ? 'hero-section' : sec.id
    }));
  }, [sections]);

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [chapterPositions, setChapterPositions] = useState<number[]>([]);

  const HEADER_OFFSET = 80;

  const updateMeasurements = useCallback(() => {
    if (chapters.length === 0) return;
    const viewportHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;
    const maxScroll = Math.max(1, docHeight - viewportHeight);

    const positions = chapters.map((ch, idx) => {
      if (idx === 0) return 0;
      if (idx === chapters.length - 1) return 100;
      const el = document.getElementById(ch.targetId);
      if (!el) return (idx / (chapters.length - 1)) * 100;
      const triggerScroll = Math.max(0, el.offsetTop - HEADER_OFFSET);
      return Math.min(100, Math.max(0, (triggerScroll / maxScroll) * 100));
    });

    setChapterPositions(positions);
  }, [chapters]);

  const updateActiveIndex = useCallback(() => {
    if (chapters.length === 0) return;
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;

    if (scrollY + viewportHeight >= docHeight - 30) {
      setActiveIndex(chapters.length - 1);
      return;
    }

    let current = 0;
    for (let i = chapters.length - 1; i >= 0; i--) {
      const el = document.getElementById(chapters[i].targetId);
      if (!el) continue;
      if (scrollY >= el.offsetTop - (HEADER_OFFSET + 10)) {
        current = i;
        break;
      }
    }

    setActiveIndex(current);
  }, [chapters]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateActiveIndex();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', () => {
      updateMeasurements();
      updateActiveIndex();
    }, { passive: true });
    
    updateMeasurements();
    updateActiveIndex();
    
    const timer = setTimeout(() => {
      updateMeasurements();
      updateActiveIndex();
    }, 600);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateMeasurements);
      clearTimeout(timer);
    };
  }, [updateActiveIndex, updateMeasurements, chapters]);

  const handleChapterClick = (targetId: string) => {
    const el = document.getElementById(targetId);
    if (el) {
      const elementPosition = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: Math.max(0, elementPosition - HEADER_OFFSET),
        behavior: 'smooth',
      });
    }
  };

  if (chapters.length === 0) return null;

  return (
    <nav
      id="chapters-progress-bar"
      aria-label="Portfolio Chapters Navigation"
      className="fixed top-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 transition-colors duration-200 shadow-2xs"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 sm:py-2.5">
        <div className="flex items-center justify-between gap-4 sm:gap-6">
          
          {/* Main Navigation Track (Chapter Titles + Progress Bar together - stops before ThemeToggle) */}
          <div className="flex-1 space-y-1.5 min-w-0">
            
            {/* Chapter Labels Track */}
            <div className="relative h-6 w-full text-sm">
              {chapters.map((chapter, idx) => {
                const isActive = activeIndex === idx;
                const pos = chapterPositions[idx] ?? (idx / (chapters.length - 1)) * 100;
                const ChapterIcon = getChapterIcon(chapter.type, chapter.id);
                
                let alignClass = "-translate-x-1/2";
                if (idx === 0) {
                  alignClass = "translate-x-0";
                } else if (idx === chapters.length - 1) {
                  alignClass = "-translate-x-full";
                }

                return (
                  <button
                    key={chapter.id}
                    id={`chapter-btn-${chapter.id}`}
                    onClick={() => handleChapterClick(chapter.targetId)}
                    type="button"
                    className={`absolute top-0 group text-left py-0.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded transition-all duration-200 cursor-pointer ${alignClass}`}
                    style={{ left: `${pos}%` }}
                    title={`Chapter ${chapter.num}: ${chapter.label}`}
                    aria-label={`Chapter ${chapter.num}: ${chapter.label}`}
                  >
                    <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
                      {/* Mobile: Space-efficient icon */}
                      <div
                        className={`sm:hidden flex items-center justify-center p-0.5 rounded transition-all duration-150 ${
                          isActive
                            ? 'text-blue-600 dark:text-blue-400 scale-110'
                            : 'text-stone-400 dark:text-stone-500 group-hover:text-stone-700 dark:group-hover:text-stone-300'
                        }`}
                      >
                        <ChapterIcon className="w-3.5 h-3.5" />
                      </div>

                      {/* Desktop: Number + Full Section Title */}
                      <span
                        className={`hidden sm:inline text-[10px] font-mono tracking-tight transition-all duration-150 ${
                          isActive
                            ? 'text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-stone-400 dark:text-stone-500 group-hover:text-stone-600 dark:group-hover:text-stone-300 font-normal'
                        }`}
                      >
                        {chapter.num}
                      </span>
                      <span
                        className={`hidden sm:inline text-xs tracking-tight transition-all duration-150 ${
                          isActive
                            ? 'text-stone-950 dark:text-stone-50 font-bold scale-105'
                            : 'text-stone-500 dark:text-stone-400 font-normal group-hover:text-stone-800 dark:group-hover:text-stone-200'
                        }`}
                      >
                        {chapter.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Progress Bar Container - Stops strictly before the ThemeToggle */}
            <div className="relative h-1.5 w-full bg-stone-200/80 dark:bg-stone-800 rounded-full flex items-center overflow-visible">
              {/* Progress Fill Bar */}
              <div className="w-full h-full rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-600 dark:bg-blue-500 rounded-full origin-left"
                  style={{ scaleX }}
                />
              </div>

              {/* Chapter Dots on Progress Bar */}
              {chapters.map((chapter, idx) => {
                const pos = chapterPositions[idx] ?? (idx / (chapters.length - 1)) * 100;
                const isActive = activeIndex === idx;
                const isPassed = activeIndex > idx;

                return (
                  <div
                    key={`tick-${chapter.id}`}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 pointer-events-none transition-all duration-200"
                    style={{ left: `${pos}%` }}
                  >
                    <div 
                      className={`rounded-full transition-all duration-200 ${
                        isActive 
                          ? 'w-3 h-3 bg-blue-600 dark:bg-blue-400 border-2 border-white dark:border-stone-900 ring-4 ring-blue-500/30 scale-125 shadow-sm' 
                          : isPassed
                          ? 'w-2.5 h-2.5 bg-blue-600 dark:bg-blue-500 border border-blue-600 dark:border-blue-500'
                          : 'w-2.5 h-2.5 bg-stone-300 dark:bg-stone-700 border border-stone-100 dark:border-stone-800'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

          </div>

          {/* Theme Toggle on the right with border divider */}
          <div className="shrink-0 flex items-center pl-3 sm:pl-4 border-l border-stone-200 dark:border-stone-800 self-center">
            <ThemeToggle />
          </div>

        </div>
      </div>
    </nav>
  );
};
