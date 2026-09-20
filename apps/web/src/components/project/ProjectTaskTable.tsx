'use client';

import React from 'react';
import {
  Calendar,
  CheckSquare,
  MoreHorizontal,
  Edit2,
  Trash2,
  Check,
  ArrowUpDown,
} from 'lucide-react';
import { Task, TaskPriority } from '@synca/types';
import { cn } from '@/lib/utils';

interface ProjectTaskTableProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onToggleSubtask?: (taskId: string, subtaskIndex: number) => void;
}

export function ProjectTaskTable({
  tasks,
  onEditTask,
  onDeleteTask,
}: ProjectTaskTableProps) {
  const priorityBadges: Record<TaskPriority, string> = {
    High: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    Medium: 'bg-[#d8f870]/15 text-zinc-900 dark:text-[#d8f870] border-[#d8f870]/30',
    Low: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  };

  const statusBadges: Record<string, string> = {
    'To Do': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    'In Progress': 'bg-[#d8f870]/15 text-zinc-900 dark:text-[#d8f870] border-[#d8f870]/30',
    Done: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  };

  if (tasks.length === 0) {
    return (
      <div className="bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl rounded-3xl p-10 border border-zinc-200/80 dark:border-white/[0.08] text-center space-y-2">
        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">No tasks found</p>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
          Create deliverables from the Board or the header to see them in tabular format.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl rounded-3xl border border-zinc-200/80 dark:border-white/[0.08] shadow-sm overflow-hidden transition-colors">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800/80 text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-[10px] bg-zinc-50/50 dark:bg-white/[0.02]">
              <th className="py-3.5 pl-6 pr-4 font-semibold">Title</th>
              <th className="py-3.5 px-4 font-semibold">Status</th>
              <th className="py-3.5 px-4 font-semibold">Priority</th>
              <th className="py-3.5 px-4 font-semibold">Checklist</th>
              <th className="py-3.5 px-4 font-semibold">Due Date</th>
              <th className="py-3.5 px-4 font-semibold">Assignees</th>
              <th className="py-3.5 pl-4 pr-6 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {tasks.map((task) => {
              const completedSubtasks =
                task.subtasks?.filter((s) => s.completed).length || 0;
              const totalSubtasks = task.subtasks?.length || 0;

              return (
                <tr
                  key={task._id}
                  className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                  onClick={() => onEditTask(task)}
                >
                  {/* Title & Desc */}
                  <td className="py-3.5 pl-6 pr-4 max-w-xs">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-[#2ecc8f] transition-colors truncate">
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <span
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap',
                        statusBadges[task.status] || 'bg-zinc-800 text-zinc-300 border-zinc-700'
                      )}
                    >
                      {task.status}
                    </span>
                  </td>

                  {/* Priority */}
                  <td className="py-3.5 px-4">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap',
                        priorityBadges[task.priority || 'Medium']
                      )}
                    >
                      {task.priority || 'Medium'}
                    </span>
                  </td>

                  {/* Checklist Counter */}
                  <td className="py-3.5 px-4">
                    {totalSubtasks > 0 ? (
                      <span className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                        <CheckSquare className="w-3.5 h-3.5 text-[#2ecc8f]" />
                        <span>
                          {completedSubtasks}/{totalSubtasks}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-600">—</span>
                    )}
                  </td>

                  {/* Due Date */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {task.dueDate ? (
                      <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        <span>
                          {new Date(task.dueDate).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-600">—</span>
                    )}
                  </td>

                  {/* Assignees */}
                  <td className="py-3.5 px-4">
                    {task.assignees && task.assignees.length > 0 ? (
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {task.assignees.slice(0, 3).map((uid, idx) => (
                          <div
                            key={idx}
                            className="w-5 h-5 rounded-full ring-1 ring-white dark:ring-zinc-900 bg-zinc-200 dark:bg-zinc-700 text-[9px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-center shrink-0"
                          >
                            {uid.slice(-2).toUpperCase()}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-600">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 pl-4 pr-6 text-right">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => onEditTask(task)}
                        className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task._id)}
                        className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
