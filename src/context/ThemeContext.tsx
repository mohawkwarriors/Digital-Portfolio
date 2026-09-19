import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: (e?: React.MouseEvent | MouseEvent) => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAnimatingRef = useRef(false);

  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('portfolio_theme');
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    // Check system preference
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('portfolio_theme', theme);
  }, [theme]);

  const toggleTheme = (e?: React.MouseEvent | MouseEvent) => {
    if (isAnimatingRef.current) return;
    const newTheme: Theme = theme === 'light' ? 'dark' : 'light';
    const isReducedMotion = typeof window !== 'undefined' && 
      window.matchMedia && 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isReducedMotion || typeof document === 'undefined') {
      setThemeState(newTheme);
      return;
    }

    isAnimatingRef.current = true;

    // Determine origin coordinates from the click event or toggle button
    let x = window.innerWidth - 50;
    let y = 35;
    if (e && typeof e.clientX === 'number' && e.clientX > 0) {
      x = e.clientX;
      y = e.clientY;
    } else {
      const toggleEl = document.getElementById('theme-mode-toggle');
      if (toggleEl) {
        const rect = toggleEl.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      }
    }

    const isToDark = newTheme === 'dark';

    // 1. Enable synchronized smooth CSS color morphing across structural surfaces
    const root = document.documentElement;
    root.classList.add('theme-transition');

    // 2. Flip theme classes on root & React state immediately so colors glide seamlessly
    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
    setThemeState(newTheme);
    localStorage.setItem('portfolio_theme', newTheme);

    // 3. Create the Specular Studio Light Sheen (Compositor-only hardware GPU rendering)
    // Soft gradient edges replace heavy CSS filter blur for a locked 120 FPS
    const sheen = document.createElement('div');
    sheen.id = 'theme-specular-sheen';

    const sheenGradient = isToDark
      ? 'linear-gradient(90deg, transparent 0%, rgba(99, 102, 241, 0.03) 20%, rgba(129, 140, 248, 0.12) 42%, rgba(255, 255, 255, 0.22) 50%, rgba(129, 140, 248, 0.12) 58%, rgba(99, 102, 241, 0.03) 80%, transparent 100%)'
      : 'linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.03) 20%, rgba(251, 191, 36, 0.14) 42%, rgba(255, 255, 255, 0.28) 50%, rgba(251, 191, 36, 0.14) 58%, rgba(245, 158, 11, 0.03) 80%, transparent 100%)';

    Object.assign(sheen.style, {
      position: 'fixed',
      top: '-20%',
      left: '-20%',
      width: '320px',
      height: '140vh',
      background: sheenGradient,
      zIndex: '999999',
      pointerEvents: 'none',
      willChange: 'transform, opacity'
    });

    document.body.appendChild(sheen);

    // Web Animations API guarantees off-thread execution on the GPU compositor
    try {
      const animation = sheen.animate(
        [
          { transform: 'translate3d(120vw, -30vh, 0) rotate(-30deg)', opacity: 0.9 },
          { transform: 'translate3d(-60vw, 110vh, 0) rotate(-30deg)', opacity: 0 }
        ],
        {
          duration: 480,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'forwards'
        }
      );

      animation.onfinish = () => {
        sheen.remove();
        root.classList.remove('theme-transition');
        isAnimatingRef.current = false;
      };
    } catch {
      // Fallback
      setTimeout(() => {
        sheen.remove();
        root.classList.remove('theme-transition');
        isAnimatingRef.current = false;
      }, 500);
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
