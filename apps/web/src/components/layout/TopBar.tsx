'use client';

import { Search, Bell, Share2, User } from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { cn } from '@/lib/utils';

export function TopBar() {
  const { activeWorkspace, isLoading } = useWorkspace();

  return (
    <header className="h-16 w-full flex items-center justify-between px-6 bg-transparent">
      {/* Search Input */}
      <div className="relative w-80">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search projects, tasks, or members..."
          className="w-full bg-white border border-zinc-200 rounded-full pl-10 pr-4 py-2 text-xs font-medium text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#4ecb9e]/50 shadow-sm transition-all"
        />
      </div>

      {/* Action Group */}
      <div className="flex items-center gap-4">
        {/* Workspace Badge */}
        <div className="px-3 py-1 rounded-full bg-white border border-zinc-200 text-xs font-semibold text-zinc-700 shadow-sm flex items-center gap-1.5">
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              activeWorkspace ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'
            )}
          />
          <span className="max-w-[150px] truncate">
            {isLoading
              ? 'Loading...'
              : activeWorkspace
              ? activeWorkspace.name
              : 'No Workspace'}
          </span>
        </div>

        {/* Notification Bell */}
        <button className="relative p-2 rounded-full bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 shadow-sm transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        {/* User Profile Avatar */}
        <div className="w-8 h-8 rounded-full bg-amber-200 border border-amber-300 flex items-center justify-center font-bold text-xs text-zinc-900 shadow-sm">
          FA
        </div>

        {/* Share Button */}
        <button className="px-4 py-1.5 rounded-full bg-[#8be6c1] hover:bg-[#7ce0b8] text-zinc-900 font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors">
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </button>
      </div>
    </header>
  );
}
