'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, KeyRound, Loader2, ArrowRight } from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { joinWorkspaceSchema } from '@synca/zod-schemas';

interface JoinWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinWorkspaceModal({ isOpen, onClose }: JoinWorkspaceModalProps) {
  const { joinWorkspace } = useWorkspace();
  const [mounted, setMounted] = useState(false);
  const [joinCode, setJoinCode] = useState('');
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
    setJoinCode(cleaned);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = joinWorkspaceSchema.safeParse({
      joinCode: joinCode.trim(),
    });

    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Join code must be 6 characters';
      setError(firstError);
      return;
    }

    try {
      setIsSubmitting(true);
      await joinWorkspace(joinCode.trim());
      setJoinCode('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired join code. Please check and try again.');
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
        <div className="absolute -top-24 -left-24 w-52 h-52 bg-[#8be6c1]/12 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#8be6c1]/15 border border-[#8be6c1]/30 flex items-center justify-center text-[#8be6c1] shadow-sm">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">Join Workspace</h3>
              <p className="text-xs text-zinc-400">Enter a 6-character code to join your team</p>
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

          {/* Join Code Input */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-zinc-300 block text-center">
              Workspace Invite Code
            </label>
            <div className="flex justify-center">
              <input
                type="text"
                autoFocus
                placeholder="ABC123"
                value={joinCode}
                onChange={handleInputChange}
                maxLength={6}
                className="w-60 px-4 py-3.5 text-center tracking-[0.35em] font-mono text-2xl font-bold uppercase rounded-2xl bg-[#1b1f26] border border-zinc-700/80 text-[#d8f870] placeholder-zinc-600 focus:outline-none focus:border-[#8be6c1] focus:ring-2 focus:ring-[#8be6c1]/20 transition-all shadow-inner"
              />
            </div>
            <p className="text-[11px] text-zinc-400 text-center">
              Ask your workspace admin for their 6-character code.
            </p>
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
              disabled={isSubmitting || joinCode.length !== 6}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#8be6c1] hover:bg-[#7ce0b8] text-zinc-950 flex items-center gap-1.5 transition-all shadow-md shadow-[#8be6c1]/10 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                <>
                  <span>Join Space</span>
                  <ArrowRight className="w-3.5 h-3.5" />
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
