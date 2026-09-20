'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Building2, Lock, Globe, Loader2, Sparkles } from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { createWorkspaceSchema } from '@synca/zod-schemas';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
  const { createWorkspace } = useWorkspace();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
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

    const validation = createWorkspaceSchema.safeParse({
      name: name.trim(),
      description: description.trim() || undefined,
      isPrivate,
    });

    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Invalid workspace details';
      setError(firstError);
      return;
    }

    try {
      setIsSubmitting(true);
      await createWorkspace({
        name: name.trim(),
        description: description.trim() || undefined,
        isPrivate,
      });
      setName('');
      setDescription('');
      setIsPrivate(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create workspace. Please try again.');
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
        className="w-full max-w-md bg-[#16191e] border border-zinc-700/80 rounded-3xl p-6 sm:p-7 text-white shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-[#d8f870]/12 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#d8f870]/15 border border-[#d8f870]/30 flex items-center justify-center text-[#d8f870] shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">Create Workspace</h3>
              <p className="text-xs text-zinc-400">Set up a new organization or team space</p>
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
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Workspace Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Workspace Name <span className="text-[#d8f870]">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Acme Studio, Product Lab"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              className="w-full px-4 py-2.5 rounded-xl bg-[#1b1f26] border border-zinc-700/80 text-zinc-100 text-xs placeholder-zinc-500 focus:outline-none focus:border-[#d8f870] focus:ring-1 focus:ring-[#d8f870] transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Description <span className="text-zinc-500 font-normal text-[11px]">(Optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="What does your team build or collaborate on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              className="w-full px-4 py-2.5 rounded-xl bg-[#1b1f26] border border-zinc-700/80 text-zinc-100 text-xs placeholder-zinc-500 focus:outline-none focus:border-[#d8f870] focus:ring-1 focus:ring-[#d8f870] transition-colors resize-none"
            />
          </div>

          {/* Privacy Toggle */}
          <div className="p-3.5 rounded-2xl bg-[#1b1f26] border border-zinc-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-zinc-800/80">
                  {isPrivate ? (
                    <Lock className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Globe className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-200">
                    {isPrivate ? 'Private Workspace' : 'Public Workspace'}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {isPrivate
                      ? 'Invite-only access via 6-character code'
                      : 'Open to all team collaborators'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivate(!isPrivate)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isPrivate ? 'bg-[#d8f870]' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-zinc-950 shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isPrivate ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
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
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#d8f870] hover:bg-[#c4ea48] text-zinc-950 flex items-center gap-1.5 transition-all shadow-md shadow-[#d8f870]/10 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Create Workspace</span>
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
