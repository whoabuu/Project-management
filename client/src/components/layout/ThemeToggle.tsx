import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="
        relative flex items-center justify-center
        w-9 h-9 rounded-xl
        bg-slate-100 dark:bg-slate-800
        hover:bg-sky-50 dark:hover:bg-sky-500/10
        border border-slate-200 dark:border-slate-700
        hover:border-sky-200 dark:hover:border-sky-500/30
        text-slate-500 dark:text-slate-400
        hover:text-sky-500 dark:hover:text-sky-400
        transition-all duration-200
        hover:scale-105 active:scale-95
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-sky-400 focus-visible:ring-offset-2
        focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950
      "
    >
      <Sun
        size={15}
        className={`absolute transition-all duration-300 ${
          isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'
        }`}
      />
      <Moon
        size={15}
        className={`absolute transition-all duration-300 ${
          !isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
        }`}
      />
    </button>
  );
};