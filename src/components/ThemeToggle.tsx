import React from 'react';
import { Sun, Moon } from 'lucide-react';
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
      <button
        type="button"
        id="theme-mode-toggle"
        onClick={toggleTheme}
        role="switch"
        aria-checked={isDark}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        className="relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border border-stone-300 dark:border-stone-700 bg-stone-200 dark:bg-stone-800 p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 dark:focus-visible:ring-stone-500 shadow-2xs hover:bg-stone-300 dark:hover:bg-stone-700"
      >
        {/* Sun and Moon background icons */}
        <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none text-[10px]">
          <Sun 
            className={`w-3.5 h-3.5 transition-opacity duration-150 ${
              isDark ? 'opacity-40 text-stone-500' : 'opacity-100 text-stone-400'
            }`} 
          />
          <Moon 
            className={`w-3.5 h-3.5 transition-opacity duration-150 ${
              isDark ? 'opacity-100 text-stone-400' : 'opacity-40 text-stone-500'
            }`} 
          />
        </div>

        {/* Sliding Indicator Thumb */}
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`pointer-events-none relative z-10 flex h-5.5 w-5.5 items-center justify-center rounded-full shadow-xs transition-colors duration-150 ${
            isDark
              ? 'translate-x-7 bg-stone-900 border border-stone-700'
              : 'translate-x-0 bg-white border border-stone-200'
          }`}
        >
          {isDark ? (
            <Moon className="w-3 h-3 text-orange-400 fill-orange-400 stroke-orange-400" />
          ) : (
            <Sun className="w-3 h-3 text-orange-500 fill-orange-500 stroke-orange-500" />
          )}
        </motion.span>
      </button>
    </div>
  );
};
