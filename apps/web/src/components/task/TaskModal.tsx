'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CheckSquare,
  Calendar,
  AlertCircle,
  Plus,
  Trash2,
  Check,
  User,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Task, TaskPriority, Subtask } from '@synca/types';
import { CreateTaskInput } from '@synca/zod-schemas';
import { cn } from '@/lib/utils';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateTaskInput) => Promise<any>;
  task?: Task | null;
  defaultStatus?: string;
  defaultColumn?: string;
  columns?: string[];
  projectId?: string;
  members?: Array<{ userId: string; name?: string; email?: string; imageUrl?: string }>;
}

const EMPTY_COLUMNS: string[] = [];
const EMPTY_MEMBERS: Array<{ userId: string; name?: string; email?: string; imageUrl?: string }> = [];

export function TaskModal({
  isOpen,
  onClose,
  onSave,
  task,
  defaultStatus = 'To Do',
  defaultColumn,
  columns = EMPTY_COLUMNS,
  projectId,
  members = EMPTY_MEMBERS,
}: TaskModalProps) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('To Do');
  const [column, setColumn] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [assignees, setAssignees] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string>('');
  const [subtasks, setSubtasks] = useState<Array<{ title: string; completed: boolean }>>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const firstColumn = columns[0];

  // Pre-fill only when modal opens or target task/defaults change
  useEffect(() => {
    if (!isOpen) return;
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setStatus(task.status || 'To Do');
      setColumn(task.column || firstColumn || 'Default Column');
      setPriority(task.priority || 'Medium');
      setAssignees(task.assignees || []);
      setDueDate(
        task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ''
      );
      setSubtasks(task.subtasks ? task.subtasks.map((st) => ({ title: st.title, completed: st.completed })) : []);
      setIsPrivate(Boolean(task.isPrivate));
    } else {
      setTitle('');
      setDescription('');
      setStatus(defaultStatus);
      setColumn(defaultColumn || firstColumn || '');
      setPriority('Medium');
      setAssignees([]);
      setDueDate('');
      setSubtasks([]);
      setIsPrivate(false);
    }
    setError(null);
  }, [task, defaultStatus, defaultColumn, firstColumn, isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const toggleAssignee = (userId: string) => {
    setAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    setSubtasks((prev) => [...prev, { title: newSubtaskTitle.trim(), completed: false }]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (idx: number) => {
    setSubtasks((prev) =>
      prev.map((st, i) => (i === idx ? { ...st, completed: !st.completed } : st))
    );
  };

  const handleDeleteSubtask = (idx: number) => {
    setSubtasks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await onSave({
        projectId: projectId || null,
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        ...(projectId ? { column: column.trim() || undefined } : {}),
        priority,
        assignees,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        subtasks,
        isPrivate,
      });

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#14171c] border border-[#e5e7eb] dark:border-white/[0.1] rounded-[20px] p-6 sm:p-7 text-[#191c1d] dark:text-zinc-100 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-[#66deb4]/12 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e5e7eb] dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e6f7f1] dark:bg-[#66deb4]/15 border border-[#a7e9d2] dark:border-[#66deb4]/30 flex items-center justify-center text-[#006c52] dark:text-[#66deb4] shadow-sm">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#191c1d] dark:text-zinc-100">
                {task ? 'Edit Task' : 'Create Task'}
              </h3>
              <p className="text-xs text-[#3e4944] dark:text-zinc-400">
                {task ? 'Update task details and checklist' : 'Add a deliverable item to your board'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#3e4944] dark:text-zinc-400 hover:text-[#191c1d] dark:hover:text-white hover:bg-[#f3f3f3] dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {error && (
            <div className="p-3 rounded-xl bg-[#ffdad6] dark:bg-rose-500/10 border border-[#ba1a1a]/20 dark:border-rose-500/20 text-[#ba1a1a] dark:text-rose-400 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a] dark:bg-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#191c1d] dark:text-zinc-300">
              Task Title <span className="text-[#006c52] dark:text-[#66deb4]">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Design authentication modal, Refactor API client"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={280}
              className="w-full px-4 py-2.5 rounded-xl bg-[#f8f9fa] dark:bg-[#15171b] border border-[#bdc9c2] dark:border-white/[0.1] text-[#191c1d] dark:text-zinc-100 text-xs placeholder-[#3e4944]/60 dark:placeholder-zinc-500 focus:outline-none focus:border-[#006c52] dark:focus:border-[#66deb4] focus:ring-1 focus:ring-[#006c52] dark:focus:ring-[#66deb4] transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#191c1d] dark:text-zinc-300">
              Description <span className="text-[#3e4944]/70 dark:text-zinc-500 font-normal text-[11px]">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Key specifications, acceptance criteria, or context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              className="w-full px-4 py-2 rounded-xl bg-[#f8f9fa] dark:bg-[#15171b] border border-[#bdc9c2] dark:border-white/[0.1] text-[#191c1d] dark:text-zinc-100 text-xs placeholder-[#3e4944]/60 dark:placeholder-zinc-500 focus:outline-none focus:border-[#006c52] dark:focus:border-[#66deb4] focus:ring-1 focus:ring-[#006c52] dark:focus:ring-[#66deb4] transition-colors resize-none"
            />
          </div>

          {/* Priority & Due Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#191c1d] dark:text-zinc-300">Priority</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Low', 'Medium', 'High'] as TaskPriority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      'py-2 rounded-xl text-xs font-semibold border text-center transition-all',
                      priority === p
                        ? p === 'High'
                          ? 'border-[#ba1a1a]/40 bg-[#ffdad6] text-[#93000a] dark:border-rose-500/60 dark:bg-rose-500/20 dark:text-rose-300'
                          : p === 'Medium'
                          ? 'border-[#191c1d]/15 bg-[#F0FF7C] text-[#191c1d] dark:border-[#F0FF7C]/40 dark:bg-[#F0FF7C]/15 dark:text-[#F0FF7C]'
                          : 'border-[#006c52]/30 bg-[#e6f7f1] text-[#006c52] dark:border-[#66deb4]/40 dark:bg-[#66deb4]/15 dark:text-[#66deb4]'
                        : 'border-[#e5e7eb] dark:border-white/[0.08] bg-[#f8f9fa] dark:bg-[#15171b] text-[#3e4944] dark:text-zinc-400 hover:text-[#191c1d] dark:hover:text-zinc-200'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#191c1d] dark:text-zinc-300">Due Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-[#f8f9fa] dark:bg-[#15171b] border border-[#bdc9c2] dark:border-white/[0.1] text-[#191c1d] dark:text-zinc-100 text-xs focus:outline-none focus:border-[#006c52] dark:focus:border-[#66deb4] focus:ring-1 focus:ring-[#006c52] dark:focus:ring-[#66deb4] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Status Selector (Decoupled from Board Column) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#191c1d] dark:text-zinc-300">Task Status</label>
            <div className="grid grid-cols-3 gap-2">
              {['To Do', 'In Progress', 'Done'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  className={cn(
                    'py-2 rounded-xl text-xs font-medium border text-center transition-all',
                    status === st
                      ? 'border-[#006c52] dark:border-[#66deb4] bg-[#e6f7f1] dark:bg-[#66deb4]/15 text-[#006c52] dark:text-[#66deb4] font-bold shadow-sm'
                      : 'border-[#e5e7eb] dark:border-white/[0.08] bg-[#f8f9fa] dark:bg-[#15171b] text-[#3e4944] dark:text-zinc-400 hover:text-[#191c1d] dark:hover:text-zinc-200 hover:border-[#bdc9c2] dark:hover:border-white/[0.15]'
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Board Column Selector (Project tasks only) */}
          {projectId && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#191c1d] dark:text-zinc-300">
                Board Column
              </label>
              {columns.length > 0 ? (
                <select
                  value={column || columns[0]}
                  onChange={(e) => setColumn(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8f9fa] dark:bg-[#15171b] border border-[#bdc9c2] dark:border-white/[0.1] text-[#191c1d] dark:text-zinc-100 text-xs focus:outline-none focus:border-[#006c52] dark:focus:border-[#66deb4]"
                >
                  {columns.map((col) => (
                    <option key={col} value={col} className="bg-white dark:bg-[#15171b] text-[#191c1d] dark:text-zinc-100">
                      {col}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-3.5 py-2.5 rounded-xl bg-[#f8f9fa] dark:bg-[#15171b]/70 border border-dashed border-[#bdc9c2] dark:border-white/[0.12] text-[#3e4944] dark:text-zinc-400 text-xs">
                  No columns yet — a <strong className="text-[#191c1d] dark:text-zinc-200">Default Column</strong> will be created automatically.
                </div>
              )}
            </div>
          )}

          {/* Assignees Selection */}
          {members.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#191c1d] dark:text-zinc-300 flex items-center justify-between">
                <span>Assignees</span>
                <span className="text-[#3e4944]/70 dark:text-zinc-500 text-[11px]">
                  {assignees.length} selected
                </span>
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-[#f8f9fa] dark:bg-[#15171b] border border-[#bdc9c2] dark:border-white/[0.1] rounded-xl">
                {members.map((m) => {
                  const isSelected = assignees.includes(m.userId);
                  const label = m.name || m.email || `Member (${m.userId.slice(-4)})`;
                  return (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() => toggleAssignee(m.userId)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all',
                        isSelected
                          ? 'bg-[#006c52] dark:bg-[#66deb4] text-white dark:text-[#111316] font-bold'
                          : 'bg-white dark:bg-[#1e2127] border border-[#e5e7eb] dark:border-white/[0.08] text-[#191c1d] dark:text-zinc-300 hover:bg-[#e6f7f1]/60 dark:hover:bg-white/[0.08]'
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subtasks Checklist */}
          <div className="space-y-2 pt-2 border-t border-[#e5e7eb] dark:border-white/[0.08]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#191c1d] dark:text-zinc-300 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-[#006c52] dark:text-[#66deb4]" />
                <span>Subtasks / Checklist</span>
              </label>
              <span className="text-[11px] text-[#3e4944]/70 dark:text-zinc-500 font-mono">
                {subtasks.filter((s) => s.completed).length}/{subtasks.length} done
              </span>
            </div>

            {/* Subtasks list */}
            {subtasks.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {subtasks.map((st, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#f8f9fa] dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] text-xs group"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleSubtask(idx)}
                      className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all',
                          st.completed
                            ? 'bg-[#006c52] dark:bg-[#66deb4] border-[#006c52] dark:border-[#66deb4] text-white dark:text-[#111316]'
                            : 'border-[#bdc9c2] dark:border-zinc-600 hover:border-[#006c52] dark:hover:border-[#66deb4]'
                        )}
                      >
                        {st.completed && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span
                        className={cn(
                          'truncate text-[#191c1d] dark:text-zinc-200 transition-colors',
                          st.completed && 'line-through text-[#3e4944]/60 dark:text-zinc-500'
                        )}
                      >
                        {st.title}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(idx)}
                      className="text-[#3e4944]/60 dark:text-zinc-500 hover:text-[#ba1a1a] dark:hover:text-rose-400 p-1 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add subtask input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add subtask and press Enter..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask(e);
                  }
                }}
                className="flex-1 px-3 py-1.5 rounded-xl bg-[#f8f9fa] dark:bg-[#15171b] border border-[#bdc9c2] dark:border-white/[0.1] text-[#191c1d] dark:text-zinc-100 text-xs placeholder-[#3e4944]/60 dark:placeholder-zinc-500 focus:outline-none focus:border-[#006c52] dark:focus:border-[#66deb4] transition-colors"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 rounded-xl bg-[#f3f3f3] dark:bg-[#1e2127] hover:bg-[#e5e7eb] dark:hover:bg-white/[0.1] text-xs font-bold text-[#191c1d] dark:text-zinc-200 transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Private Task Visibility Toggle */}
          {projectId && (
            <label className="flex items-center justify-between p-3 rounded-xl bg-[#f8f9fa] dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] cursor-pointer hover:border-[#bdc9c2] dark:hover:border-white/[0.15] transition-colors">
              <div>
                <p className="text-xs font-semibold text-[#191c1d] dark:text-zinc-200">Private Task</p>
                <p className="text-[11px] text-[#3e4944] dark:text-zinc-500">
                  Only visible to you, assignees, and project Admins/Moderators
                </p>
              </div>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 accent-[#006c52] dark:accent-[#66deb4] rounded cursor-pointer"
              />
            </label>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#e5e7eb] dark:border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#3e4944] dark:text-zinc-400 hover:text-[#191c1d] dark:hover:text-zinc-200 hover:bg-[#f3f3f3] dark:hover:bg-white/[0.06] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#006c52] hover:bg-[#005742] text-white flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{task ? 'Save Changes' : 'Create Task'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
