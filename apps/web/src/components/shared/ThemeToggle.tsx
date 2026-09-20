'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function ThemeToggle({ className, size = 'md' }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          'rounded-full bg-white dark:bg-[#16191e] border border-zinc-200 dark:border-zinc-800 p-2 shadow-sm',
          size === 'sm' ? 'w-8 h-8' : 'w-9 h-9',
          className
        )}
      />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
      aria-label="Toggle theme"
      className={cn(
        'relative rounded-full bg-white dark:bg-[#16191e] border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white shadow-sm hover:shadow transition-all flex items-center justify-center group active:scale-95',
        size === 'sm' ? 'w-8 h-8 p-1.5' : 'w-9 h-9 p-2',
        className
      )}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 text-[#d8f870] transition-all duration-300 transform rotate-0 scale-100 group-hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 text-zinc-700 transition-all duration-300 transform rotate-0 scale-100 group-hover:-rotate-12" />
        )}
      </div>
    </button>
  );
}
