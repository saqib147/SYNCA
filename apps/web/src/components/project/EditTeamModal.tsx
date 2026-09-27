'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { updateMemberRoleApi, removeMemberApi } from '@/lib/api/project.api';
import { cn } from '@/lib/utils';

interface TeamMemberProfile {
  userId: string;
  name?: string;
  email?: string;
  imageUrl?: string;
  projectRole?: 'Admin' | 'Moderator' | 'Member';
}

interface EditTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  currentUserRole?: 'Admin' | 'Moderator' | 'Member';
  teamMemberProfiles?: TeamMemberProfile[];
  onTeamUpdated: () => void;
}

export function EditTeamModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  currentUserRole = 'Member',
  teamMemberProfiles = [],
  onTeamUpdated,
}: EditTeamModalProps) {
  const { getToken } = useAuth();
  const [mounted, setMounted] = useState(false);
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

  if (!mounted || !isOpen) return null;

  const isAdmin = currentUserRole === 'Admin';

  const handleRoleChange = async (targetUserId: string, newRole: 'Admin' | 'Moderator' | 'Member') => {
    if (!isAdmin) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('Authentication session expired');

      await updateMemberRoleApi(projectId, targetUserId, newRole, token);
      onTeamUpdated();
    } catch (err: any) {
      setError(err?.message || 'Failed to update member role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!isAdmin) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('Authentication session expired');

      await removeMemberApi(projectId, targetUserId, token);
      onTeamUpdated();
    } catch (err: any) {
      setError(err?.message || 'Failed to remove member');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#10141e] border border-zinc-200 dark:border-white/[0.1] p-6 shadow-2xl text-zinc-900 dark:text-zinc-100 z-10 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-lime-500/10 border border-lime-500/20 text-lime-600 dark:text-lime-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Manage Project Roster</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-xs">
                Members and roles in <span className="font-semibold text-zinc-800 dark:text-zinc-200">{projectName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Member Roster List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-500 px-1 font-semibold">
            <span>{teamMemberProfiles.length} Project Members</span>
            {!isAdmin && <span className="text-amber-500 italic">Admin permissions required to edit roles</span>}
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
            {teamMemberProfiles.length > 0 ? (
              teamMemberProfiles.map((m) => {
                const role = m.projectRole || 'Member';
                const initials = (m.name || m.email || 'U').slice(0, 2).toUpperCase();

                return (
                  <div
                    key={m.userId}
                    className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden font-bold text-xs text-lime-400">
                        {m.imageUrl ? (
                          <img src={m.imageUrl} alt={m.name || 'Member'} className="w-full h-full object-cover" />
                        ) : (
                          initials
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate text-zinc-900 dark:text-zinc-100">
                          {m.name || 'Project Member'}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate font-mono">
                          {m.email || m.userId}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAdmin ? (
                        <select
                          value={role}
                          disabled={isSubmitting}
                          onChange={(e) => handleRoleChange(m.userId, e.target.value as any)}
                          className={cn(
                            'text-xs font-bold px-2.5 py-1 rounded-xl border focus:outline-none transition-colors cursor-pointer',
                            role === 'Admin'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : role === 'Moderator'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                          )}
                        >
                          <option value="Admin">Admin</option>
                          <option value="Moderator">Moderator</option>
                          <option value="Member">Member</option>
                        </select>
                      ) : (
                        <span
                          className={cn(
                            'text-xs font-bold px-2.5 py-1 rounded-xl border',
                            role === 'Admin'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : role === 'Moderator'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                          )}
                        >
                          {role}
                        </span>
                      )}

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.userId)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors text-xs font-semibold"
                          title="Remove from project"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-zinc-500 text-xs">
                No members found in project roster.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-zinc-100 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
