'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { KeyRound, X, Loader2, AlertCircle } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';

interface JoinProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (projectId: string) => void;
}

export function JoinProjectModal({ isOpen, onClose, onSuccess }: JoinProjectModalProps) {
  const { joinProject } = useProjects();
  const router = useRouter();
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
      const joined = await joinProject(cleanCode);
      setJoinCode('');
      onClose();
      if (onSuccess) {
        onSuccess(joined._id);
      } else {
        router.push(`/projects/${joined._id}`);
      }
    } catch (err: any) {
      console.error('[JoinProjectModal] Error:', err);
      setError(err.message || 'Failed to join project. Check your code.');
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#14171c] rounded-[20px] border border-[#bdc9c2] dark:border-white/[0.1] shadow-2xl overflow-hidden text-[#191c1d] dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#e5e7eb] dark:border-white/[0.08] flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-[12px] bg-[#e6f7f1] dark:bg-[#006c52]/25 border border-[#79deba]/60 dark:border-[#79deba]/30 flex items-center justify-center text-[#006c52] dark:text-[#79deba] shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Funnel_Display',sans-serif] font-medium text-[20px] leading-[26px] text-[#191c1d] dark:text-white">
                Join a Project
              </h2>
              <p className="text-[13px] text-[#3e4944] dark:text-zinc-400 mt-0.5">
                Enter a 6-character code for any Public workspace.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-[8px] text-[#3e4944] dark:text-zinc-400 hover:text-[#191c1d] dark:hover:text-white hover:bg-[#f3f3f3] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-[10px] bg-[#ffdad6] dark:bg-rose-500/15 border border-[#ba1a1a]/30 text-[#93000a] dark:text-rose-300 text-[13px]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[13px] font-medium text-[#191c1d] dark:text-zinc-200 mb-2">
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
              placeholder="AB12CD"
              className="w-full px-4 py-3 text-center tracking-[0.35em] font-mono text-[22px] uppercase rounded-[10px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#bdc9c2] dark:border-white/[0.12] text-[#191c1d] dark:text-white placeholder:text-[#3e4944]/40 dark:placeholder:text-zinc-600 focus:outline-none focus:border-[#006c52] dark:focus:border-[#79deba]"
              autoFocus
            />
            <p className="text-[11px] text-[#3e4944] dark:text-zinc-500 mt-2">
              Private projects require a direct email invite from a project Admin or Moderator.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#e5e7eb] dark:border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-[13px] font-medium rounded-[8px] text-[#3e4944] dark:text-zinc-300 hover:bg-[#f3f3f3] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || joinCode.trim().length !== 6}
              className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold rounded-[8px] bg-[#006c52] hover:bg-[#005943] dark:bg-[#66deb4] dark:hover:bg-[#52d1a4] text-white dark:text-[#111316] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                <span>Join &amp; Open</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
