'use client';

import { Search, Bell, Share2 } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

export function TopBar() {
  return (
    <header className="h-16 w-full flex items-center justify-between px-6 bg-transparent">
      {/* Search Input */}
      <div className="relative w-80">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search projects, tasks, or members..."
          className="w-full bg-white dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] rounded-full pl-10 pr-4 py-2 text-xs font-medium text-[#191c1d] dark:text-zinc-100 placeholder-[#3e4944]/60 dark:placeholder-zinc-500 focus:outline-none focus:border-[#006c52] dark:focus:border-[#66deb4] focus:ring-2 focus:ring-[#006c52]/15 dark:focus:ring-[#66deb4]/20 shadow-sm transition-all"
        />
      </div>

      {/* Action Group */}
      <div className="flex items-center gap-3">
        {/* Status Badge */}
        <div className="px-3 py-1 rounded-full bg-white dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] text-xs font-semibold text-[#191c1d] dark:text-zinc-300 shadow-sm flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#66deb4]" />
          <span className="max-w-[150px] truncate">Synca Platform</span>
        </div>

        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* Notification Bell */}
        <button className="relative p-2 rounded-full bg-white dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] text-[#3e4944] dark:text-zinc-300 hover:text-[#191c1d] dark:hover:text-white shadow-sm transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#ba1a1a] dark:bg-rose-500 ring-2 ring-white dark:ring-[#15171b]" />
        </button>

        {/* Share Button */}
        <button className="px-4 py-1.5 rounded-full bg-[#006c52] hover:bg-[#005742] text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors">
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </button>
      </div>
    </header>
  );
}
