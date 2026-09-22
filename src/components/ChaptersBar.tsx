import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, useSpring, useMotionValue } from 'motion/react';
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
  const scrollProgress = useMotionValue(0);
  const scaleX = useSpring(scrollProgress, {
    stiffness: 110,
    damping: 28,
    restDelta: 0.0005
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

  // Stably anchored chapter positions — never jitter or jump when accordions open/close
  const chapterPositions = useMemo(() => {
    if (chapters.length <= 1) return [0];
    return chapters.map((_, idx) => (idx / (chapters.length - 1)) * 100);
  }, [chapters]);

  const HEADER_OFFSET = 80;

  const updateProgressAndActive = useCallback(() => {
    if (chapters.length === 0) return;
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;

    // If reached the bottom of page, clamp to 100%
    if (scrollY + viewportHeight >= docHeight - 30) {
      setActiveIndex(chapters.length - 1);
      scrollProgress.set(1);
      return;
    }

    const N = chapters.length;
    const sectionData = chapters.map((ch) => {
      const el = document.getElementById(ch.targetId);
      if (!el) return { top: 0, height: 500 };
      return {
        top: Math.max(0, el.offsetTop - HEADER_OFFSET),
        height: el.offsetHeight || 500
      };
    });

    // Determine active index
    let current = 0;
    for (let i = N - 1; i >= 0; i--) {
      if (scrollY >= sectionData[i].top - 15) {
        current = i;
        break;
      }
    }
    setActiveIndex(current);

    // If above or at the very first section
    if (N <= 1 || scrollY <= sectionData[0].top) {
      scrollProgress.set(0);
      return;
    }

    // Smooth section-anchored progress: prevents jumping back when an accordion changes document height
    let progress = 0;
    for (let i = 0; i < N - 1; i++) {
      const curTop = sectionData[i].top;
      const nextTop = sectionData[i + 1].top;
      if (scrollY >= curTop && scrollY < nextTop) {
        const span = Math.max(1, nextTop - curTop);
        const ratio = Math.min(1, Math.max(0, (scrollY - curTop) / span));
        const start = i / (N - 1);
        const end = (i + 1) / (N - 1);
        progress = start + ratio * (end - start);
        break;
      } else if (scrollY >= nextTop && i === N - 2) {
        progress = 1;
      }
    }

    scrollProgress.set(progress);
  }, [chapters, scrollProgress]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateProgressAndActive();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    // Also observe DOM height changes (e.g. when card collapses/expands) smoothly
    const observer = new ResizeObserver(() => {
      handleScroll();
    });
    observer.observe(document.body);

    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      observer.disconnect();
    };
  }, [updateProgressAndActive]);

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
          <div className="flex-1 space-y-1.5 min-w-0 px-4 sm:px-8">
            
            {/* Chapter Labels Track */}
            <div className="relative h-6 w-full text-sm">
              {chapters.map((chapter, idx) => {
                const isActive = activeIndex === idx;
                const pos = chapterPositions[idx] ?? (idx / (chapters.length - 1)) * 100;
                const ChapterIcon = getChapterIcon(chapter.type, chapter.id);

                return (
                  <button
                    key={chapter.id}
                    id={`chapter-btn-${chapter.id}`}
                    onClick={() => handleChapterClick(chapter.targetId)}
                    type="button"
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group text-center focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded transition-all duration-200 cursor-pointer"
                    style={{ left: `${pos}%` }}
                    title={`Chapter ${chapter.num}: ${chapter.label}`}
                    aria-label={`Chapter ${chapter.num}: ${chapter.label}`}
                  >
                    <div className="inline-flex items-baseline justify-center gap-1.5 whitespace-nowrap leading-none">
                      {/* Mobile: Space-efficient icon */}
                      <div
                        className={`sm:hidden flex items-center justify-center p-0.5 rounded transition-all duration-150 self-center ${
                          isActive
                            ? 'text-blue-600 dark:text-blue-400 scale-110'
                            : 'text-stone-400 dark:text-stone-500 group-hover:text-stone-700 dark:group-hover:text-stone-300'
                        }`}
                      >
                        <ChapterIcon className="w-3.5 h-3.5" />
                      </div>

                      {/* Desktop: Number + Full Section Title perfectly aligned by baseline */}
                      <span
                        className={`hidden sm:inline-block text-xs font-mono tracking-tight leading-none align-baseline transition-colors duration-150 ${
                          isActive
                            ? 'text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-stone-400 dark:text-stone-500 group-hover:text-stone-600 dark:group-hover:text-stone-300 font-medium'
                        }`}
                      >
                        {chapter.num}
                      </span>
                      <span
                        className={`hidden sm:inline-block text-xs tracking-tight leading-none align-baseline transition-colors duration-150 ${
                          isActive
                            ? 'text-stone-950 dark:text-stone-50 font-bold'
                            : 'text-stone-500 dark:text-stone-400 font-medium group-hover:text-stone-800 dark:group-hover:text-stone-200'
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
