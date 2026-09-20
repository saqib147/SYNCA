'use client';

import React, { useState } from 'react';
import { X, KeyRound, Loader2, ArrowRight } from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { joinWorkspaceSchema } from '@synca/zod-schemas';

interface JoinWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinWorkspaceModal({ isOpen, onClose }: JoinWorkspaceModalProps) {
  const { joinWorkspace } = useWorkspace();
  const [joinCode, setJoinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow alphanumeric, up to 6 characters, uppercase
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#16191e] border border-zinc-800/80 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#8be6c1]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#8be6c1]/15 border border-[#8be6c1]/30 flex items-center justify-center text-[#8be6c1]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">Join Workspace</h3>
              <p className="text-xs text-zinc-400">Enter a 6-character code to join your team</p>
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

          {/* Join Code Input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300 block text-center">
              Invite Code
            </label>
            <div className="flex justify-center">
              <input
                type="text"
                autoFocus
                placeholder="ABC123"
                value={joinCode}
                onChange={handleInputChange}
                maxLength={6}
                className="w-56 px-4 py-3 text-center tracking-[0.3em] font-mono text-xl font-bold uppercase rounded-2xl bg-[#1e232b] border border-zinc-800 text-[#d8f870] placeholder-zinc-600 focus:outline-none focus:border-[#d8f870] focus:ring-2 focus:ring-[#d8f870]/30 transition-all shadow-inner"
              />
            </div>
            <p className="text-[11px] text-zinc-400 text-center">
              Ask your workspace admin for their 6-character invite code.
            </p>
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
              disabled={isSubmitting || joinCode.length !== 6}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#8be6c1] hover:bg-[#7ce0b8] text-zinc-900 flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
}
