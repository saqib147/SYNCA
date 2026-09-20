'use client';

import React, { useState } from 'react';
import { X, Building2, Lock, Globe, Loader2, Sparkles } from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { createWorkspaceSchema } from '@synca/zod-schemas';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
  const { createWorkspace } = useWorkspace();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate using Zod schema
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
      // Reset and close
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#16191e] border border-zinc-800/80 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#d8f870]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#d8f870]/15 border border-[#d8f870]/30 flex items-center justify-center text-[#d8f870]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">Create Workspace</h3>
              <p className="text-xs text-zinc-400">Set up a new organization or team space</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
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
            <label className="text-xs font-medium text-zinc-300">
              Workspace Name <span className="text-[#d8f870]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Studio, Product Lab"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#1e232b] border border-zinc-800 text-zinc-100 text-xs placeholder-zinc-500 focus:outline-none focus:border-[#d8f870] focus:ring-1 focus:ring-[#d8f870] transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">
              Description <span className="text-zinc-500 text-[10px]">(Optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="What does your team build or collaborate on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#1e232b] border border-zinc-800 text-zinc-100 text-xs placeholder-zinc-500 focus:outline-none focus:border-[#d8f870] focus:ring-1 focus:ring-[#d8f870] transition-colors resize-none"
            />
          </div>

          {/* Privacy Toggle */}
          <div className="p-3 rounded-2xl bg-[#1e232b] border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isPrivate ? (
                  <Lock className="w-4 h-4 text-amber-400" />
                ) : (
                  <Globe className="w-4 h-4 text-emerald-400" />
                )}
                <div>
                  <p className="text-xs font-medium text-zinc-200">
                    {isPrivate ? 'Private Workspace' : 'Public Workspace'}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {isPrivate
                      ? 'Only invited members and join-code holders can view'
                      : 'Discoverable and open to all room collaborators'}
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
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-zinc-900 shadow-lg ring-0 transition duration-200 ease-in-out ${
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
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#d8f870] hover:bg-[#c4ea48] text-zinc-900 flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
}
