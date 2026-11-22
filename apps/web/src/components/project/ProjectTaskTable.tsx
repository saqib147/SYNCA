'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CheckSquare,
  Edit2,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Task, TaskPriority } from '@synca/types';
import { cn } from '@/lib/utils';

interface ProjectTaskTableProps {
  columns: string[];
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onSelectTask?: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddTaskToColumn?: (column?: string) => void;
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
  columns,
  tasks,
  onEditTask,
  onSelectTask,
  onDeleteTask,
  onAddTaskToColumn,
  members,
  canManageTask,
}: ProjectTaskTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [collapsedCols, setCollapsedCols] = useState<Record<string, boolean>>({});

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const okStatus = statusFilter === 'All' || t.status === statusFilter;
      const okPriority =
        priorityFilter === 'All' || (t.priority || 'Medium') === priorityFilter;
      return okStatus && okPriority;
    });
  }, [tasks, statusFilter, priorityFilter]);

  const toggleCollapse = (colName: string) => {
    setCollapsedCols((prev) => ({ ...prev, [colName]: !prev[colName] }));
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Done':
        return {
          pill: 'bg-[#e6f7f1] dark:bg-emerald-500/15 text-[#006c52] dark:text-emerald-300',
          dot: 'bg-[#006c52] dark:bg-emerald-400',
        };
      case 'In Progress':
        return {
          pill: 'bg-[#eef6ff] dark:bg-sky-500/15 text-sky-700 dark:text-sky-300',
          dot: 'bg-sky-500',
        };
      default:
        return {
          pill: 'bg-[#e7e8e9] dark:bg-white/[0.08] text-[#3e4944] dark:text-zinc-300',
          dot: 'bg-[#6b7280]',
        };
    }
  };

  if (columns.length === 0 && tasks.length === 0) {
    return (
      <div className="rounded-[12px] bg-white dark:bg-[#15171b] p-12 border border-dashed border-[#bdc9c2] dark:border-white/[0.12] text-center space-y-3">
        <p className="font-['Funnel_Display',sans-serif] text-[18px] font-medium text-[#191c1d] dark:text-white">
          No columns or tasks yet
        </p>
        <p className="text-[13px] text-[#3e4944] dark:text-zinc-400 max-w-sm mx-auto">
          Add columns on the Board or create your first task — each board column appears as its own organized list here.
        </p>
        {onAddTaskToColumn && (
          <button
            type="button"
            onClick={() => onAddTaskToColumn(undefined)}
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
    <div className="space-y-5">
      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['All', 'To Do', 'In Progress', 'Done'] as const).map((st) => (
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
              {st === 'All' ? 'All Statuses' : st}
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

      {/* Separate List Section Per Board Column */}
      <div className="space-y-5">
        {columns.map((colName) => {
          const colTasks = filteredTasks
            .filter((t) => (t.column || 'Default Column') === colName)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
          const isCollapsed = Boolean(collapsedCols[colName]);

          return (
            <div
              key={colName}
              className="rounded-[12px] bg-white dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] overflow-hidden"
            >
              {/* Column List Header */}
              <div className="px-5 py-3.5 bg-[#f8f9fa] dark:bg-white/[0.03] border-b border-[#e5e7eb] dark:border-white/[0.08] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => toggleCollapse(colName)}
                  className="flex items-center gap-2 text-left cursor-pointer"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-[#3e4944] dark:text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#3e4944] dark:text-zinc-400" />
                  )}
                  <span className="size-2 rounded-full bg-[#006c52] dark:bg-[#66deb4]" />
                  <h3 className="font-['Funnel_Display',sans-serif] font-medium text-[16px] text-[#191c1d] dark:text-white">
                    {colName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-[6px] bg-[#e7e8e9] dark:bg-white/[0.08] text-[11px] font-medium text-[#3e4944] dark:text-zinc-400">
                    {colTasks.length}
                  </span>
                </button>

                {onAddTaskToColumn && (
                  <button
                    type="button"
                    onClick={() => onAddTaskToColumn(colName)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-[12px] font-medium text-[#006c52] dark:text-[#79deba] hover:bg-[#e6f7f1] dark:hover:bg-[#006c52]/20 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Task</span>
                  </button>
                )}
              </div>

              {!isCollapsed && (
                <div className="overflow-x-auto">
                  {colTasks.length === 0 ? (
                    <div className="py-7 px-5 text-center text-[12.5px] text-[#3e4944] dark:text-zinc-500">
                      No tasks in <strong>{colName}</strong>
                      {statusFilter !== 'All' || priorityFilter !== 'All'
                        ? ' matching the active filters.'
                        : '.'}
                    </div>
                  ) : (
                    <table className="w-full text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-[#e5e7eb]/80 dark:border-white/[0.06] text-[11px] uppercase tracking-[0.5px] text-[#3e4944] dark:text-zinc-500">
                          <th className="py-2.5 pl-5 pr-4 font-semibold">Task</th>
                          <th className="py-2.5 px-4 font-semibold">Status</th>
                          <th className="py-2.5 px-4 font-semibold">Priority</th>
                          <th className="py-2.5 px-4 font-semibold">Subtasks</th>
                          <th className="py-2.5 px-4 font-semibold">Due Date</th>
                          <th className="py-2.5 px-4 font-semibold">Assignees</th>
                          <th className="py-2.5 pl-4 pr-5 font-semibold text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e5e7eb]/70 dark:divide-white/[0.06]">
                        {colTasks.map((task) => {
                          const completedSubtasks =
                            task.subtasks?.filter((s) => s.completed).length || 0;
                          const totalSubtasks = task.subtasks?.length || 0;
                          const pct =
                            totalSubtasks > 0
                              ? Math.round((completedSubtasks / totalSubtasks) * 100)
                              : 0;
                          const statusStyle = getStatusStyle(task.status);
                          const priorityBadge =
                            PRIORITY_BADGES[task.priority || 'Medium'];
                          const isOverdue =
                            task.dueDate &&
                            task.status !== 'Done' &&
                            new Date(task.dueDate).getTime() < Date.now();

                          return (
                            <tr
                              key={task._id}
                              onClick={() =>
                                onSelectTask ? onSelectTask(task) : onEditTask(task)
                              }
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
                                  <span
                                    className={cn(
                                      'size-1.5 rounded-full',
                                      statusStyle.dot
                                    )}
                                  />
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
                                  <span className="text-[#3e4944]/40 dark:text-zinc-600">
                                    —
                                  </span>
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
                                      {new Date(task.dueDate).toLocaleDateString(
                                        'en-US',
                                        {
                                          month: 'short',
                                          day: 'numeric',
                                        }
                                      )}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-[#3e4944]/40 dark:text-zinc-600">
                                    —
                                  </span>
                                )}
                              </td>

                              <td className="py-3.5 px-4">
                                {task.assignees && task.assignees.length > 0 ? (
                                  <div className="flex -space-x-1.5">
                                    {task.assignees.slice(0, 3).map((uid, idx) => {
                                      const member = members?.find(
                                        (m) => m.userId === uid
                                      );
                                      const label =
                                        member?.name || member?.email || uid;
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
                                  <span className="text-[#3e4944]/40 dark:text-zinc-600">
                                    —
                                  </span>
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
                                        if (
                                          window.confirm(
                                            `Delete task "${task.title}"?`
                                          )
                                        ) {
                                          onDeleteTask(task._id);
                                        }
                                      }}
                                      className="p-1.5 rounded-[6px] text-[#3e4944] dark:text-zinc-400 hover:text-[#ba1a1a] dark:hover:text-rose-400 hover:bg-[#ffdad6]/50 dark:hover:bg-rose-500/15 transition-colors cursor-pointer"
                                      title="Delete task"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
