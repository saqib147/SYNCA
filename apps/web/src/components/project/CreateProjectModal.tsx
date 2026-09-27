'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FolderKanban, Lock, Globe, Loader2, Sparkles, KeyRound } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useUser } from '@clerk/nextjs';
import { createProjectSchema } from '@synca/zod-schemas';
import { ProjectStatus, ProjectPrivacy } from '@synca/types';
import { cn } from '@/lib/utils';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (projectId: string) => void;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  onCreated,
}: CreateProjectModalProps) {
  const { createProject } = useProjects();
  const { user } = useUser();

  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('ActiveSprint');
  const [privacy, setPrivacy] = useState<ProjectPrivacy>('Public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = createProjectSchema.safeParse({
      name: name.trim(),
      description: description.trim() || undefined,
      status,
      privacy,
    });

    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Invalid project data';
      setError(firstError);
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        privacy,
      });

      setName('');
      setDescription('');
      setStatus('ActiveSprint');
      setPrivacy('Public');

      if (onCreated) {
        onCreated(created._id);
      }
      onClose();
    } catch (err: any) {
      console.error('[CreateProjectModal] Submission error:', err);
      setError(err.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#10141e] rounded-3xl border border-zinc-200 dark:border-white/[0.1] shadow-2xl overflow-hidden p-6 text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#d8f870]/20 dark:bg-[#d8f870]/10 text-zinc-900 dark:text-[#d8f870] border border-[#d8f870]/30">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>Create New Project</span>
                <Sparkles className="w-4 h-4 text-lime-500 inline" />
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                A 6-character Join Code will be generated automatically
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Project Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Project Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mobile App Redesign, DevSecOps Initiative"
              className="w-full px-4 py-2.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.1] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#d8f870]/50 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Description / Objectives
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of project scope, timelines, or goals..."
              className="w-full px-4 py-2.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.1] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#d8f870]/50 transition-all resize-none"
            />
          </div>

          {/* Status & Privacy Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.1] text-zinc-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#d8f870]/50"
              >
                <option value="ActiveSprint">Active Sprint</option>
                <option value="OnTrack">On Track</option>
                <option value="AtRisk">At Risk</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Visibility
              </label>
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value as ProjectPrivacy)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.1] text-zinc-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#d8f870]/50"
              >
                <option value="Public">Public (Join via Code)</option>
                <option value="Private">Private (Invite Only)</option>
              </select>
            </div>
          </div>

          {/* Info Banner */}
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-lime-500/10 border border-lime-500/20 text-lime-700 dark:text-lime-400 text-xs">
            <KeyRound className="w-4 h-4 shrink-0 text-lime-500" />
            <span>As creator, you will automatically be assigned as <strong>Project Admin</strong>.</span>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-lime-400 to-emerald-500 text-zinc-950 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Project...</span>
                </>
              ) : (
                <span>Create Project</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
