'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { KeyRound, X, Loader2, AlertCircle } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';

interface JoinProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function JoinProjectModal({ isOpen, onClose, onSuccess }: JoinProjectModalProps) {
  const { joinProject } = useProjects();
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      setError('Join code must be exactly 6 characters');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await joinProject(cleanCode);
      setJoinCode('');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('[JoinProjectModal] Error:', err);
      setError(err.message || 'Failed to join project. Check your code.');
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#10141e] rounded-2xl border border-zinc-200 dark:border-white/[0.1] shadow-2xl overflow-hidden p-6 text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-lime-500/10 text-lime-600 dark:text-lime-400 border border-lime-500/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Join Project</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Enter a 6-character code to join an existing project
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Project Join Code
            </label>
            <input
              type="text"
              maxLength={6}
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="e.g. AB12CD"
              className="w-full px-4 py-3 text-center tracking-[0.3em] font-mono text-xl uppercase rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.1] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-lime-500/50"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || joinCode.trim().length !== 6}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-lime-400 to-emerald-500 text-zinc-950 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                <span>Join Project</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
