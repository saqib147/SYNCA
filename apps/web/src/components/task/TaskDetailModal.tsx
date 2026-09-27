'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  CheckSquare,
  Clock,
  User,
  MessageSquare,
  Send,
  Edit3,
  Trash2,
  Check,
  Loader2,
  Shield,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { Task, TaskPriority, ProjectRole } from '@synca/types';
import { useAuth, useUser } from '@clerk/nextjs';
import { addTaskCommentApi, updateTaskApi, deleteTaskApi } from '@/lib/api/task.api';
import { cn } from '@/lib/utils';

// Re-export Lucide icons cleanly
import {
  X as CloseIcon,
  Calendar as CalendarIcon,
  CheckSquare as SubtaskIcon,
  User as UserIcon,
  MessageSquare as CommentIcon,
  Send as SendIcon,
  Edit3 as EditIcon,
  Trash2 as TrashIcon,
  Check as CheckIcon,
  Loader2 as SpinnerIcon,
  Shield as ShieldIcon,
  Tag as TagIcon,
} from 'lucide-react';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  projectName?: string;
  userProjectRole?: ProjectRole | null;
  members?: Array<{ userId: string; name?: string; email?: string; imageUrl?: string }>;
  onEditTask?: (task: Task) => void;
  onTaskUpdated?: (updatedTask: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
}

export function TaskDetailModal({
  isOpen,
  onClose,
  task: initialTask,
  projectName = 'Active Project',
  userProjectRole,
  members = [],
  onEditTask,
  onTaskUpdated,
  onTaskDeleted,
}: TaskDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const { user } = useUser();
  const { getToken } = useAuth();

  const [task, setTask] = useState<Task | null>(initialTask);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setTask(initialTask);
    setError(null);
    setCommentText('');
  }, [initialTask, isOpen]);

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

  if (!isOpen || !mounted || !task) return null;

  const currentUserId = user?.id;
  const isCreator = Boolean(currentUserId && task.createdBy === currentUserId);
  const isAdminOrMod = Boolean(
    userProjectRole === 'Admin' || userProjectRole === 'Moderator'
  );
  const isAssignee = Boolean(currentUserId && task.assignees?.includes(currentUserId));

  // Can full edit / delete
  const canEditOrDelete = isCreator || isAdminOrMod;
  // Can change status / check subtasks / comment
  const canInteract = canEditOrDelete || isAssignee;

  const handleStatusChange = async (newStatus: string) => {
    if (!task || isUpdatingStatus) return;
    try {
      setIsUpdatingStatus(true);
      setError(null);
      const token = await getToken();
      if (!token) return;

      const updated = await updateTaskApi(task._id, { status: newStatus }, token);
      setTask(updated);
      onTaskUpdated?.(updated);
      window.dispatchEvent(new CustomEvent('synca:tasks-changed'));
    } catch (err: any) {
      setError(err?.message || 'Failed to update task status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleToggleSubtask = async (subtaskIndex: number) => {
    if (!task || !task.subtasks) return;
    try {
      const token = await getToken();
      if (!token) return;

      const updatedSubtasks = task.subtasks.map((st, idx) =>
        idx === subtaskIndex ? { ...st, completed: !st.completed } : st
      );

      const updated = await updateTaskApi(
        task._id,
        { subtasks: updatedSubtasks as any },
        token
      );
      setTask(updated);
      onTaskUpdated?.(updated);
      window.dispatchEvent(new CustomEvent('synca:tasks-changed'));
    } catch (err: any) {
      setError(err?.message || 'Failed to update subtask');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmittingComment || !task) return;

    try {
      setIsSubmittingComment(true);
      setError(null);
      const token = await getToken();
      if (!token) return;

      const updated = await addTaskCommentApi(task._id, commentText.trim(), token);
      setTask(updated);
      setCommentText('');
      onTaskUpdated?.(updated);
    } catch (err: any) {
      setError(err?.message || 'Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!task || isDeleting) return;
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);
      const token = await getToken();
      if (!token) return;

      await deleteTaskApi(task._id, token);
      onTaskDeleted?.(task._id);
      window.dispatchEvent(new CustomEvent('synca:tasks-changed'));
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'No due date';

  const completedSubtasksCount = task.subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasksCount = task.subtasks?.length || 0;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#12161f] border border-zinc-700/80 rounded-3xl text-zinc-100 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-[#8be6c1]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-zinc-800 flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {/* Project Badge */}
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                {projectName}
              </span>

              {/* Priority Pill */}
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider',
                  task.priority === 'High'
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                    : task.priority === 'Medium'
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                )}
              >
                {task.priority} Priority
              </span>

              {/* Status Pill */}
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
                  task.status === 'Done'
                    ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                    : task.status === 'In Progress'
                    ? 'border-blue-500/30 bg-blue-500/20 text-blue-300'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                )}
              >
                {task.status}
              </span>
            </div>

            <h2 className="text-xl font-bold text-zinc-100 leading-snug tracking-tight">
              {task.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors shrink-0"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 scrollbar-none">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Status Selector Bar */}
          <div className="bg-[#1a1f2c] border border-zinc-700/60 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <ShieldIcon className="w-3.5 h-3.5 text-[#8be6c1]" />
              <span>Task Status:</span>
            </span>

            <div className="flex items-center gap-1.5">
              {['To Do', 'In Progress', 'Done'].map((st) => (
                <button
                  key={st}
                  disabled={!canInteract || isUpdatingStatus}
                  onClick={() => handleStatusChange(st)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border',
                    task.status === st
                      ? 'bg-[#8be6c1] text-zinc-950 border-[#8be6c1] shadow-sm font-bold'
                      : 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white',
                    (!canInteract || isUpdatingStatus) && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Key Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#171b26] p-4 rounded-2xl border border-zinc-800">
            {/* Due Date */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 shrink-0">
                <CalendarIcon className="w-4.5 h-4.5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Due Date</p>
                <p className="text-xs font-semibold text-zinc-200 mt-0.5">{formattedDueDate}</p>
              </div>
            </div>

            {/* Assignees Roster */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 shrink-0">
                <UserIcon className="w-4.5 h-4.5 text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Assignees</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {task.assignees && task.assignees.length > 0 ? (
                    task.assignees.map((assigneeId) => {
                      const m = members.find((mem) => mem.userId === assigneeId);
                      const nameLabel = m?.name || m?.email || `Member (${assigneeId.slice(-4)})`;
                      return (
                        <span
                          key={assigneeId}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-200"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          <span className="truncate max-w-[120px]">{nameLabel}</span>
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs text-zinc-500 italic">Unassigned</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Description</h4>
            <div className="p-4 rounded-2xl bg-[#171b26] border border-zinc-800 text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed min-h-[70px]">
              {task.description ? task.description : <span className="text-zinc-500 italic">No description provided.</span>}
            </div>
          </div>

          {/* Subtasks Checklist */}
          {totalSubtasksCount > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <SubtaskIcon className="w-4 h-4 text-[#8be6c1]" />
                  <span>Subtasks & Checklist</span>
                </h4>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                  {completedSubtasksCount}/{totalSubtasksCount} completed
                </span>
              </div>

              <div className="space-y-2">
                {task.subtasks.map((st, idx) => (
                  <div
                    key={idx}
                    onClick={() => canInteract && handleToggleSubtask(idx)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl bg-[#171b26] border border-zinc-800/80 transition-all text-xs cursor-pointer',
                      st.completed ? 'opacity-70 bg-zinc-900/60' : 'hover:border-zinc-700'
                    )}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all',
                        st.completed
                          ? 'bg-emerald-500 border-emerald-500 text-zinc-950'
                          : 'border-zinc-600'
                      )}
                    >
                      {st.completed && <CheckIcon className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className={cn('text-zinc-200 font-medium', st.completed && 'line-through text-zinc-500')}>
                      {st.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <CommentIcon className="w-4 h-4 text-blue-400" />
                <span>Task Activity & Comments ({task.comments?.length || 0})</span>
              </h4>
            </div>

            {/* Past Comments */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {task.comments && task.comments.length > 0 ? (
                task.comments.map((comment, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-[#171b26] border border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {comment.userAvatar ? (
                          <img
                            src={comment.userAvatar}
                            alt={comment.userName}
                            className="w-5 h-5 rounded-full object-cover border border-zinc-700"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center border border-emerald-500/30">
                            {comment.userName.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs font-bold text-zinc-200">{comment.userName}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 pl-7 leading-relaxed">{comment.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 italic py-2 text-center bg-[#171b26]/50 rounded-xl border border-zinc-800/50">
                  No comments yet. Post an update below.
                </p>
              )}
            </div>

            {/* Comment Form */}
            {canInteract && (
              <form onSubmit={handleAddComment} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Write a comment or status update..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  maxLength={1000}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#171b26] border border-zinc-700/80 text-zinc-100 text-xs placeholder-zinc-500 focus:outline-none focus:border-[#8be6c1] transition-colors"
                />
                <button
                  type="submit"
                  disabled={isSubmittingComment || !commentText.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#8be6c1] hover:bg-[#78d2ad] text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {isSubmittingComment ? (
                    <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <SendIcon className="w-3.5 h-3.5" />
                      <span>Post</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Modal Footer / Role-Gated Admin Controls */}
        <div className="p-4 px-6 border-t border-zinc-800 bg-[#0f121a] rounded-b-3xl flex items-center justify-between gap-3">
          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <ShieldIcon className="w-3.5 h-3.5 text-zinc-400" />
            <span>
              {canEditOrDelete
                ? 'Admin / Creator Permissions'
                : 'Assigned Member View (Read & Comment)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {canEditOrDelete && (
              <>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                {onEditTask && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEditTask(task);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <EditIcon className="w-3.5 h-3.5" />
                    <span>Edit Task</span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
