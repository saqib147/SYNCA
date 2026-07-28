'use client';

import { Sparkles, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TaskCardProps {
  title: string;
  projectName: string;
  dueDate: string;
  status?: string;
  tag?: string;
  assigneeAvatar?: string;
  assigneeName?: string;
  bgVariant?: 'yellow' | 'peach' | 'white';
  className?: string;
}

export function TaskCard({
  title,
  projectName,
  dueDate,
  status = 'Upcoming',
  tag = 'DevSek',
  assigneeAvatar,
  assigneeName = 'FA',
  bgVariant = 'white',
  className,
}: TaskCardProps) {
  const bgStyles = {
    yellow: 'bg-[#fefdce] border-amber-200/80 shadow-sm',
    peach: 'bg-[#ffeedb] border-orange-200/80 shadow-sm',
    white: 'bg-white border-zinc-200/90 shadow-sm hover:shadow-md',
  };

  return (
    <div
      className={cn(
        'rounded-3xl p-5 border transition-all space-y-3 relative overflow-hidden select-none',
        bgStyles[bgVariant],
        className
      )}
    >
      {/* Top Row: Title + Assignee & Status Badge */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-bold text-zinc-900 tracking-tight leading-snug">
          {title}
        </h3>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Assignee Avatar */}
          <div className="w-7 h-7 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
            {assigneeAvatar ? (
              <img src={assigneeAvatar} alt={assigneeName} className="w-full h-full object-cover" />
            ) : (
              <span>{assigneeName.slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          {/* Status Badge */}
          <span className="px-3 py-1 rounded-full bg-white/90 border border-zinc-200 text-xs font-medium text-zinc-600 shadow-2xs">
            {status}
          </span>
        </div>
      </div>

      {/* Middle Row: Project Name */}
      <p className="text-xs font-medium text-zinc-500">
        {projectName}
      </p>

      {/* Bottom Row: Due Date Pill & Tag Badge */}
      <div className="flex items-center justify-between pt-2">
        {/* Due Date Pill */}
        <span className="px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-bold shadow-sm flex items-center gap-1">
          <span>Due: {dueDate}</span>
        </span>

        {/* Tag Pill */}
        <span className="px-3 py-1 rounded-full bg-white border border-zinc-200 text-zinc-700 text-xs font-semibold shadow-2xs flex items-center gap-1.5">
          <span className="text-rose-400">✳</span>
          <span>{tag}</span>
        </span>
      </div>
    </div>
  );
}
