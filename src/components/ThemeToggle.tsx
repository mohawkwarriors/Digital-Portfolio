import React from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <motion.button
        type="button"
        id="theme-mode-toggle"
        onClick={(e) => toggleTheme(e)}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.92 }}
        role="switch"
        aria-checked={isDark}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 shadow-inner ${
          isDark
            ? 'bg-gradient-to-r from-slate-950 via-indigo-950 to-stone-900 border-indigo-800/60 hover:border-indigo-600/70 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]'
            : 'bg-gradient-to-r from-amber-100 via-orange-50 to-sky-100 border-amber-300/80 hover:border-amber-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]'
        }`}
      >
        {/* Background track details: Stars in Dark Mode, Golden rays in Light Mode */}
        <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none overflow-hidden rounded-full">
          {/* Sun icon / Warm glow on the left */}
          <motion.div
            initial={false}
            animate={{
              opacity: isDark ? 0.25 : 1,
              scale: isDark ? 0.75 : 1,
              rotate: isDark ? -45 : 0
            }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-center text-amber-500"
          >
            <Sun className="w-3.5 h-3.5 fill-amber-400/30 stroke-amber-500" />
          </motion.div>

          {/* Sparkles / Moon on the right */}
          <motion.div
            initial={false}
            animate={{
              opacity: isDark ? 1 : 0.25,
              scale: isDark ? 1 : 0.75,
              rotate: isDark ? 0 : 45
            }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-center text-indigo-300"
          >
            {isDark ? (
              <Sparkles className="w-3 h-3 text-indigo-300/80 animate-pulse" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-stone-400" />
            )}
          </motion.div>
        </div>

        {/* Sliding Indicator Thumb */}
        <motion.span
          layout
          transition={{
            type: 'spring',
            stiffness: 600,
            damping: 32,
            mass: 0.8
          }}
          className={`pointer-events-none relative z-10 flex h-5.5 w-5.5 items-center justify-center rounded-full shadow-md transition-colors duration-300 ${
            isDark
              ? 'translate-x-7 bg-gradient-to-br from-indigo-950 to-stone-900 border border-indigo-400/30 shadow-[0_0_8px_rgba(99,102,241,0.35)]'
              : 'translate-x-0 bg-white border border-amber-200/90 shadow-[0_1px_4px_rgba(245,158,11,0.25)]'
          }`}
        >
          <motion.div
            key={isDark ? 'dark-icon' : 'light-icon'}
            initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex items-center justify-center"
          >
            {isDark ? (
              <Moon className="w-3 h-3 text-indigo-300 fill-indigo-300/40 stroke-indigo-300" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-400 stroke-amber-500" />
            )}
          </motion.div>
        </motion.span>
      </motion.button>
    </div>
  );
};
