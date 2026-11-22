'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { X, Users, UserPlus, Mail, MessageSquare, Loader2, Shield } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import {
  addProjectMemberApi,
  updateMemberRoleApi,
  removeMemberApi,
} from '@/lib/api/project.api';
import { useTeammates } from '@/hooks/useTeammates';
import { notifyProjectsChanged } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

interface EnrichedMember {
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
  teamMemberProfiles: EnrichedMember[];
  isAdmin: boolean;
  canInvite?: boolean;
  onTeamUpdated: () => void;
}

export function EditTeamModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  teamMemberProfiles,
  isAdmin,
  canInvite = isAdmin,
  onTeamUpdated,
}: EditTeamModalProps) {
  const { getToken, userId: currentUserId } = useAuth();
  const { teammates } = useTeammates();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add by email state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Moderator' | 'Member'>('Member');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccessMsg(null);
      setInviteEmail('');
      setInviteRole('Member');
    }
  }, [isOpen]);

  // Existing teammates from other projects who are NOT yet in this project
  const existingMemberIds = useMemo(
    () => new Set(teamMemberProfiles.map((m) => m.userId)),
    [teamMemberProfiles]
  );

  const quickAddCandidates = useMemo(
    () => teammates.filter((t) => !existingMemberIds.has(t.userId)).slice(0, 6),
    [teammates, existingMemberIds]
  );

  if (!isOpen || !mounted) return null;

  const adminCount = teamMemberProfiles.filter((p) => (p.projectRole || 'Member') === 'Admin').length;

  const handleAddByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canInvite || !inviteEmail.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccessMsg(null);
      const token = await getToken();
      if (!token) throw new Error('Authentication session expired');

      const added = await addProjectMemberApi(
        projectId,
        { email: inviteEmail.trim(), role: isAdmin ? inviteRole : 'Member' },
        token
      );
      setInviteEmail('');
      setSuccessMsg(`Added ${added.name || inviteEmail.trim()} as ${added.role}.`);
      notifyProjectsChanged();
      onTeamUpdated();
    } catch (err: any) {
      setError(err?.message || 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAdd = async (targetUserId: string, name: string) => {
    if (!canInvite) return;
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccessMsg(null);
      const token = await getToken();
      if (!token) throw new Error('Authentication session expired');

      await addProjectMemberApi(projectId, { userId: targetUserId, role: 'Member' }, token);
      setSuccessMsg(`Added ${name} to ${projectName}.`);
      notifyProjectsChanged();
      onTeamUpdated();
    } catch (err: any) {
      setError(err?.message || 'Failed to add collaborator');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: 'Admin' | 'Moderator' | 'Member') => {
    if (!isAdmin) return;
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccessMsg(null);
      const token = await getToken();
      if (!token) throw new Error('Authentication session expired');

      await updateMemberRoleApi(projectId, targetUserId, newRole, token);
      onTeamUpdated();
    } catch (err: any) {
      setError(err?.message || 'Failed to update role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!isAdmin) return;
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccessMsg(null);
      const token = await getToken();
      if (!token) throw new Error('Authentication session expired');

      await removeMemberApi(projectId, targetUserId, token);
      notifyProjectsChanged();
      onTeamUpdated();
    } catch (err: any) {
      setError(err?.message || 'Failed to remove member');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-[#10141e] border border-zinc-200 dark:border-white/[0.1] p-6 shadow-2xl text-zinc-900 dark:text-zinc-100 z-10 space-y-5 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-lime-500/10 border border-lime-500/20 text-lime-600 dark:text-lime-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Members, Invites &amp; Roles</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-sm">
                Manage collaborators in <span className="font-semibold text-zinc-800 dark:text-zinc-200">{projectName}</span>
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
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
            {successMsg}
          </div>
        )}

        {/* Add Member by Email (Admins & Moderators) */}
        {canInvite && (
          <div className="space-y-3 p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/[0.08]">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
              <UserPlus className="w-3.5 h-3.5 text-emerald-500" />
              <span>Add Member by Exact Email</span>
            </div>
            <form onSubmit={handleAddByEmail} className="flex flex-wrap sm:flex-nowrap gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-[#d8f870]"
                />
              </div>
              {isAdmin && (
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none"
                >
                  <option value="Member">Member</option>
                  <option value="Moderator">Moderator</option>
                  <option value="Admin">Admin</option>
                </select>
              )}
              <button
                type="submit"
                disabled={isSubmitting || !inviteEmail.trim()}
                className="px-4 py-2 rounded-xl bg-[#d8f870] hover:bg-[#c4ea48] text-zinc-950 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors shrink-0"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                <span>Add</span>
              </button>
            </form>

            {/* Quick-add existing teammates from other projects */}
            {quickAddCandidates.length > 0 && (
              <div className="pt-2 border-t border-zinc-200/70 dark:border-white/[0.06] space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Quick-add from your other projects
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {quickAddCandidates.map((t) => (
                    <button
                      key={t.userId}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleQuickAdd(t.userId, t.name)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 hover:bg-emerald-500/15 border border-zinc-200 dark:border-zinc-700 text-[11px] font-medium text-zinc-700 dark:text-zinc-200 transition-colors"
                    >
                      <span>+ {t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Role Capability Legend */}
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <p className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Admin
            </p>
            <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">Full control, roles, join code &amp; delete</p>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/20">
            <p className="font-bold text-purple-600 dark:text-purple-400">Moderator</p>
            <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">Tasks, goals, invites &amp; chat moderation</p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/20">
            <p className="font-bold text-blue-600 dark:text-blue-400">Member</p>
            <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">Collaborate on tasks, comments &amp; chat</p>
          </div>
        </div>

        {/* Member Roster List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-zinc-500 px-1 font-semibold">
            <span>{teamMemberProfiles.length} Project Members</span>
            {!isAdmin && <span className="text-amber-500 italic text-[11px]">Only Admins can change roles or remove members</span>}
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
            {teamMemberProfiles.length > 0 ? (
              teamMemberProfiles.map((m) => {
                const role = m.projectRole || 'Member';
                const initials = (m.name || m.email || 'U').slice(0, 2).toUpperCase();
                const isSoleAdmin = role === 'Admin' && adminCount <= 1;
                const isSelf = m.userId === currentUserId;

                return (
                  <div
                    key={m.userId}
                    className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] gap-2"
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
                          {m.name || 'Project Member'} {isSelf && <span className="text-[10px] text-zinc-400">(You)</span>}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate font-mono">
                          {m.email || m.userId}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isSelf && (
                        <Link
                          href={`/chats?dm=${m.userId}&name=${encodeURIComponent(m.name || m.email || '')}&avatar=${encodeURIComponent(m.imageUrl || '')}`}
                          onClick={onClose}
                          title={`Message ${m.name || 'member'}`}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-500 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </Link>
                      )}

                      {isAdmin ? (
                        <select
                          value={role}
                          disabled={isSubmitting || isSoleAdmin}
                          title={isSoleAdmin ? 'Promote another Admin before changing this role' : 'Change role'}
                          onChange={(e) => handleRoleChange(m.userId, e.target.value as any)}
                          className={cn(
                            'text-xs font-bold px-2.5 py-1 rounded-xl border focus:outline-none transition-colors cursor-pointer disabled:opacity-60',
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

                      {isAdmin && !isSoleAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Remove ${m.name || m.email || 'this member'} from ${projectName}?`)) {
                              handleRemoveMember(m.userId);
                            }
                          }}
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
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/[0.1] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
