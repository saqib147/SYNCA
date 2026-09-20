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
    yellow: 'bg-[#fefdce] dark:bg-amber-950/25 backdrop-blur-md border-amber-200/80 dark:border-amber-500/25',
    peach: 'bg-[#ffeedb] dark:bg-orange-950/25 backdrop-blur-md border-orange-200/80 dark:border-orange-500/25',
    white: 'bg-white dark:bg-white/[0.04] backdrop-blur-md border-zinc-200/90 dark:border-white/[0.08]',
  };

  return (
    <div
      className={cn(
        'rounded-3xl p-5 border transition-all space-y-3 relative overflow-hidden select-none hover:-translate-y-0.5 duration-200',
        bgStyles[bgVariant],
        className
      )}
    >
      {/* Top Row: Title + Assignee & Status Badge */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-normal text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug">
          {title}
        </h3>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Assignee Avatar */}
          <div className="w-7 h-7 rounded-full bg-zinc-900 dark:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center border-2 border-white dark:border-white/[0.15] shadow-sm overflow-hidden">
            {assigneeAvatar ? (
              <img src={assigneeAvatar} alt={assigneeName} className="w-full h-full object-cover" />
            ) : (
              <span>{assigneeName.slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          {/* Status Badge */}
          <span className="px-3 py-1 rounded-full bg-white/90 dark:bg-white/[0.06] backdrop-blur-sm border border-zinc-200 dark:border-white/[0.08] text-xs font-medium text-zinc-600 dark:text-zinc-300 shadow-2xs">
            {status}
          </span>
        </div>
      </div>

      {/* Middle Row: Project Name */}
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {projectName}
      </p>

      {/* Bottom Row: Due Date Pill & Tag Badge */}
      <div className="flex items-center justify-between pt-2">
        {/* Due Date Pill */}
        <span
          className={cn(
            'px-3 py-1 rounded-full text-xs font-bold shadow-2xs flex items-center gap-1 transition-all',
            status === 'Completed'
              ? 'bg-emerald-500 text-white'
              : status === 'Overdue'
                ? 'bg-rose-500 text-white'
                : 'bg-zinc-100 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/[0.08]'
          )}
        >
          <span>{status === 'Completed' ? 'Done: ' : 'Due: '}{dueDate}</span>
        </span>

        {/* Tag Pill */}
        <span className="px-3 py-1 rounded-full bg-white dark:bg-white/[0.06] border border-zinc-200 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 text-xs font-semibold shadow-2xs flex items-center gap-1.5">
          <span className="text-rose-400">✳</span>
          <span>{tag}</span>
        </span>
      </div>
    </div>
  );
}
