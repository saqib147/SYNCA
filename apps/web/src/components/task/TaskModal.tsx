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
  projectId?: string;
  members?: Array<{ userId: string; name?: string; email?: string; imageUrl?: string }>;
}

export function TaskModal({
  isOpen,
  onClose,
  onSave,
  task,
  defaultStatus = 'To Do',
  projectId,
  members = [],
}: TaskModalProps) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('To Do');
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

  // Pre-fill if editing or changing task
  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setStatus(task.status || 'To Do');
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
      setPriority('Medium');
      setAssignees([]);
      setDueDate('');
      setSubtasks([]);
      setIsPrivate(false);
    }
    setError(null);
  }, [task, defaultStatus, isOpen]);

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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#16191e] border border-zinc-700/80 rounded-3xl p-6 sm:p-7 text-white shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-[#d8f870]/12 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#d8f870]/15 border border-[#d8f870]/30 flex items-center justify-center text-[#d8f870] shadow-sm">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">
                {task ? 'Edit Task' : 'Create Task'}
              </h3>
              <p className="text-xs text-zinc-400">
                {task ? 'Update task details and checklist' : 'Add a deliverable item to your board'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Task Title <span className="text-[#d8f870]">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Design authentication modal, Refactor API client"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={280}
              className="w-full px-4 py-2.5 rounded-xl bg-[#1b1f26] border border-zinc-700/80 text-zinc-100 text-xs placeholder-zinc-500 focus:outline-none focus:border-[#d8f870] focus:ring-1 focus:ring-[#d8f870] transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Description <span className="text-zinc-500 font-normal text-[11px]">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Key specifications, acceptance criteria, or context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              className="w-full px-4 py-2 rounded-xl bg-[#1b1f26] border border-zinc-700/80 text-zinc-100 text-xs placeholder-zinc-500 focus:outline-none focus:border-[#d8f870] focus:ring-1 focus:ring-[#d8f870] transition-colors resize-none"
            />
          </div>

          {/* Priority & Due Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Priority</label>
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
                          ? 'border-rose-500/60 bg-rose-500/20 text-rose-300'
                          : p === 'Medium'
                          ? 'border-[#d8f870] bg-[#d8f870]/15 text-[#d8f870]'
                          : 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300'
                        : 'border-zinc-800 bg-[#1b1f26] text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Due Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-[#1b1f26] border border-zinc-700/80 text-zinc-100 text-xs focus:outline-none focus:border-[#d8f870] focus:ring-1 focus:ring-[#d8f870] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Status Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Column / Status</label>
            <div className="grid grid-cols-3 gap-2">
              {['To Do', 'In Progress', 'Done'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  className={cn(
                    'py-2 rounded-xl text-xs font-medium border text-center transition-all',
                    status === st
                      ? 'border-[#d8f870] bg-[#d8f870]/10 text-[#d8f870] font-bold shadow-sm'
                      : 'border-zinc-800 bg-[#1b1f26] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Assignees Selection */}
          {members.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>Assignees</span>
                <span className="text-zinc-500 text-[11px]">
                  {assignees.length} selected
                </span>
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-[#1b1f26] border border-zinc-700/80 rounded-xl">
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
                          ? 'bg-[#d8f870] text-zinc-950 font-bold'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
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
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-[#d8f870]" />
                <span>Subtasks / Checklist</span>
              </label>
              <span className="text-[11px] text-zinc-500 font-mono">
                {subtasks.filter((s) => s.completed).length}/{subtasks.length} done
              </span>
            </div>

            {/* Subtasks list */}
            {subtasks.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {subtasks.map((st, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#1b1f26] border border-zinc-700/60 text-xs group"
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
                            ? 'bg-[#d8f870] border-[#d8f870] text-zinc-950'
                            : 'border-zinc-600 hover:border-[#d8f870]'
                        )}
                      >
                        {st.completed && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span
                        className={cn(
                          'truncate text-zinc-200 transition-colors',
                          st.completed && 'line-through text-zinc-500'
                        )}
                      >
                        {st.title}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(idx)}
                      className="text-zinc-500 hover:text-rose-400 p-1 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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
                className="flex-1 px-3 py-1.5 rounded-xl bg-[#1b1f26] border border-zinc-700/80 text-zinc-100 text-xs placeholder-zinc-500 focus:outline-none focus:border-[#d8f870] transition-colors"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#d8f870] hover:bg-[#c4ea48] text-zinc-950 flex items-center gap-1.5 transition-all shadow-md shadow-[#d8f870]/10 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
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
