'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CheckSquare,
  Edit2,
  Trash2,
  Plus,
} from 'lucide-react';
import { Task, TaskPriority } from '@synca/types';
import { cn } from '@/lib/utils';

interface ProjectTaskTableProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onSelectTask?: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddTask?: () => void;
  members?: Array<{ userId: string; name?: string; email?: string; imageUrl?: string }>;
  canManageTask?: (task: Task) => boolean;
}

const PRIORITY_BADGES: Record<TaskPriority, { label: string; className: string }> = {
  High: {
    label: 'High Priority',
    className:
      'bg-[#ffdad6] dark:bg-rose-500/15 text-[#93000a] dark:text-rose-300',
  },
  Medium: {
    label: 'Medium',
    className:
      'bg-[#ddec6b] dark:bg-[#d8f870]/20 text-[#606a00] dark:text-[#d8f870]',
  },
  Low: {
    label: 'Low',
    className:
      'bg-[#e6f7f1] dark:bg-emerald-500/15 text-[#006c52] dark:text-emerald-300',
  },
};

export function ProjectTaskTable({
  tasks,
  onEditTask,
  onSelectTask,
  onDeleteTask,
  onAddTask,
  members,
  canManageTask,
}: ProjectTaskTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');

  const availableStatuses = useMemo(() => {
    const base = new Set<string>(['To Do', 'In Progress', 'Done']);
    tasks.forEach((t) => {
      if (t.status) base.add(t.status);
    });
    return ['All', ...Array.from(base)];
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const okStatus = statusFilter === 'All' || t.status === statusFilter;
      const okPriority = priorityFilter === 'All' || (t.priority || 'Medium') === priorityFilter;
      return okStatus && okPriority;
    });
  }, [tasks, statusFilter, priorityFilter]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Done':
        return {
          pill: 'bg-[#e6f7f1] dark:bg-emerald-500/15 text-[#006c52] dark:text-emerald-300',
          dot: 'bg-[#006c52] dark:bg-emerald-400',
        };
      case 'In Progress':
        return {
          pill: 'bg-[#ddec6b]/70 dark:bg-[#d8f870]/15 text-[#5a6400] dark:text-[#d8f870]',
          dot: 'bg-[#5a6400] dark:bg-[#d8f870]',
        };
      default:
        return {
          pill: 'bg-[#e7e8e9] dark:bg-white/[0.08] text-[#3e4944] dark:text-zinc-300',
          dot: 'bg-[#6b7280]',
        };
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="rounded-[12px] bg-white dark:bg-[#15171b] p-12 border border-dashed border-[#bdc9c2] dark:border-white/[0.12] text-center space-y-3">
        <p className="font-['Funnel_Display',sans-serif] text-[18px] font-medium text-[#191c1d] dark:text-white">
          No tasks yet
        </p>
        <p className="text-[13px] text-[#3e4944] dark:text-zinc-400 max-w-sm mx-auto">
          Create deliverables to track progress, assignees, and deadlines in tabular view.
        </p>
        {onAddTask && (
          <button
            type="button"
            onClick={onAddTask}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[#006c52] dark:bg-[#66deb4] text-white dark:text-[#111316] text-[13px] font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Task</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {availableStatuses.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={cn(
                'px-3 py-1.5 rounded-[8px] text-[12.5px] font-medium transition-colors cursor-pointer border',
                statusFilter === st
                  ? 'bg-[#191c1d] dark:bg-white text-white dark:text-[#191c1d] border-[#191c1d] dark:border-white'
                  : 'bg-[#f8f9fa] dark:bg-white/[0.04] text-[#3e4944] dark:text-zinc-400 border-[#e5e7eb] dark:border-white/[0.08] hover:border-[#bdc9c2]'
              )}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {(['All', 'High', 'Medium', 'Low'] as const).map((pr) => (
            <button
              key={pr}
              type="button"
              onClick={() => setPriorityFilter(pr)}
              className={cn(
                'px-2.5 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors cursor-pointer border',
                priorityFilter === pr
                  ? 'bg-[#e6f7f1] dark:bg-[#006c52]/25 text-[#006c52] dark:text-[#79deba] border-[#79deba]'
                  : 'bg-white dark:bg-white/[0.02] text-[#3e4944] dark:text-zinc-400 border-[#e5e7eb] dark:border-white/[0.08] hover:border-[#bdc9c2]'
              )}
            >
              {pr === 'All' ? 'Any Priority' : pr}
            </button>
          ))}
        </div>
      </div>

      {/* Table Surface */}
      <div className="rounded-[12px] bg-white dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#e5e7eb] dark:border-white/[0.08] bg-[#f8f9fa] dark:bg-white/[0.02] text-[11px] uppercase tracking-[0.5px] text-[#3e4944] dark:text-zinc-400">
                <th className="py-3 pl-5 pr-4 font-semibold">Task</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Priority</th>
                <th className="py-3 px-4 font-semibold">Subtasks</th>
                <th className="py-3 px-4 font-semibold">Due Date</th>
                <th className="py-3 px-4 font-semibold">Assignees</th>
                <th className="py-3 pl-4 pr-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e7eb]/70 dark:divide-white/[0.06]">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-10 text-center text-[13px] text-[#3e4944] dark:text-zinc-500"
                  >
                    No tasks match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const completedSubtasks =
                    task.subtasks?.filter((s) => s.completed).length || 0;
                  const totalSubtasks = task.subtasks?.length || 0;
                  const pct =
                    totalSubtasks > 0
                      ? Math.round((completedSubtasks / totalSubtasks) * 100)
                      : 0;
                  const statusStyle = getStatusStyle(task.status);
                  const priorityBadge = PRIORITY_BADGES[task.priority || 'Medium'];
                  const isOverdue =
                    task.dueDate &&
                    task.status !== 'Done' &&
                    new Date(task.dueDate).getTime() < Date.now();

                  return (
                    <tr
                      key={task._id}
                      onClick={() => (onSelectTask ? onSelectTask(task) : onEditTask(task))}
                      className="hover:bg-[#f8f9fa] dark:hover:bg-white/[0.03] transition-colors group cursor-pointer"
                    >
                      <td className="py-3.5 pl-5 pr-4 max-w-xs">
                        <p className="font-semibold text-[#191c1d] dark:text-zinc-100 group-hover:text-[#006c52] dark:group-hover:text-[#79deba] transition-colors truncate">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-[12px] text-[#3e4944] dark:text-zinc-500 truncate mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] text-[11.5px] font-medium',
                            statusStyle.pill
                          )}
                        >
                          <span className={cn('size-1.5 rounded-full', statusStyle.dot)} />
                          {task.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex px-2.5 py-0.5 rounded-[10px] text-[11.5px] font-medium',
                            priorityBadge.className
                          )}
                        >
                          {priorityBadge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {totalSubtasks > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-[5px] rounded-full bg-[#e1e3e4] dark:bg-white/[0.1] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#66deb4]"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="inline-flex items-center gap-1 text-[11.5px] text-[#3e4944] dark:text-zinc-400">
                              <CheckSquare className="w-3 h-3 text-[#006c52] dark:text-[#79deba]" />
                              {completedSubtasks}/{totalSubtasks}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#3e4944]/40 dark:text-zinc-600">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {task.dueDate ? (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 text-[12px]',
                              isOverdue
                                ? 'text-[#ba1a1a] dark:text-rose-400 font-medium'
                                : 'text-[#3e4944] dark:text-zinc-400'
                            )}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {new Date(task.dueDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[#3e4944]/40 dark:text-zinc-600">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {task.assignees && task.assignees.length > 0 ? (
                          <div className="flex -space-x-1.5">
                            {task.assignees.slice(0, 3).map((uid, idx) => {
                              const member = members?.find((m) => m.userId === uid);
                              const label = member?.name || member?.email || uid;
                              return (
                                <div
                                  key={idx}
                                  title={label}
                                  className="size-6 rounded-full ring-2 ring-white dark:ring-[#15171b] bg-[#e7e8e9] dark:bg-zinc-700 text-[10px] font-semibold text-[#191c1d] dark:text-zinc-100 flex items-center justify-center shrink-0 overflow-hidden"
                                >
                                  {member?.imageUrl ? (
                                    <img
                                      src={member.imageUrl}
                                      alt={label}
                                      className="size-full object-cover"
                                    />
                                  ) : (
                                    label.slice(0, 2).toUpperCase()
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-[#3e4944]/40 dark:text-zinc-600">—</span>
                        )}
                      </td>

                      <td className="py-3.5 pl-4 pr-5 text-right">
                        {(canManageTask ? canManageTask(task) : true) && (
                          <div
                            className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => onEditTask(task)}
                              className="p-1.5 rounded-[6px] text-[#3e4944] dark:text-zinc-400 hover:text-[#191c1d] dark:hover:text-white hover:bg-[#e7e8e9]/70 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                              title="Edit task"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete task "${task.title}"?`)) {
                                  onDeleteTask(task._id);
                                }
                              }}
                              className="p-1.5 rounded-[6px] text-[#3e4944] dark:text-zinc-400 hover:text-[#ba1a1a] hover:bg-[#ffdad6]/50 dark:hover:bg-rose-500/15 transition-colors cursor-pointer"
                              title="Delete task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
