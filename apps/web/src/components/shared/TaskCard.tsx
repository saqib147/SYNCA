'use client';

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
  tag = 'Project',
  bgVariant = 'white',
  className,
}: TaskCardProps) {
  const variantClasses = {
    yellow:
      'border-[#d5d5d5] dark:border-amber-500/25 bg-gradient-to-r from-[#f5ffac] to-[#fcffe4] dark:from-amber-950/35 dark:to-amber-900/15',
    peach:
      'border-[#d9d9d9] dark:border-orange-500/25 bg-gradient-to-r from-[#ffdfac] to-[#fff9ef] dark:from-orange-950/35 dark:to-orange-900/15',
    white:
      'border-[#d9d9d9] dark:border-white/[0.08] bg-white dark:bg-white/[0.04]',
  };

  return (
    <div
      className={cn(
        'rounded-[20px] px-5 py-4 border transition-all flex flex-col justify-between min-h-[126px] relative overflow-hidden select-none hover:-translate-y-0.5 duration-200',
        variantClasses[bgVariant],
        className
      )}
    >
      {/* Top Row: Title + Status Pill */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[14px] font-light text-black dark:text-zinc-100 leading-snug line-clamp-1 font-['Funnel_Display']">
          {title}
        </h3>

        <span className="px-3 py-1 rounded-full bg-white/60 dark:bg-white/[0.06] border border-[#d5d5d5] dark:border-white/[0.1] text-[10px] font-light text-black dark:text-zinc-300 shrink-0 leading-none">
          {status}
        </span>
      </div>

      {/* Middle Row: Project Name */}
      <p className="text-[12px] font-light text-black/70 dark:text-zinc-400 mt-1 truncate">
        {projectName}
      </p>

      {/* Bottom Row: Coral Due Date Pill & Tag Pill */}
      <div className="flex items-center justify-between pt-4 gap-2">
        <span
          className={cn(
            'px-2.5 py-0.5 rounded-full text-[10px] font-light text-white leading-tight',
            status === 'Completed'
              ? 'bg-[#4ba384]'
              : bgVariant === 'yellow'
              ? 'bg-[#e85151]'
              : 'bg-[#e85151]/85'
          )}
        >
          {status === 'Completed' ? 'Done: ' : 'Due: '}
          {dueDate}
        </span>

        <span className="px-2.5 py-0.5 rounded-full bg-white dark:bg-white/[0.08] border border-[#d8d8d8] dark:border-white/[0.1] text-black dark:text-zinc-200 text-[11px] font-light flex items-center gap-1.5 max-w-[130px] truncate">
          <span className="w-3 h-3 rounded-full bg-rose-500/15 text-rose-500 flex items-center justify-center text-[8px] shrink-0">
            ✳
          </span>
          <span className="truncate">{tag}</span>
        </span>
      </div>
    </div>
  );
}
