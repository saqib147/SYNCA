'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Search, Check, Loader2, UserPlus, UserMinus, Shield } from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useAuth, useUser } from '@clerk/nextjs';
import { updateProjectApi } from '@/lib/api/project.api';
import { cn } from '@/lib/utils';

interface EditTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  currentTeamMembers: string[];
  currentMembers?: Array<{ userId: string; role?: 'Admin' | 'Member' | 'Viewer'; projectRole?: 'Admin' | 'Member' | 'Viewer' }>;
  onTeamUpdated: (updatedProject: any) => void;
}

export function EditTeamModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  currentTeamMembers,
  currentMembers,
  onTeamUpdated,
}: EditTeamModalProps) {
  const { activeWorkspace } = useWorkspace();
  const { getToken } = useAuth();
  const { user } = useUser();

  const [mounted, setMounted] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(currentTeamMembers || []);
  const [memberRoles, setMemberRoles] = useState<Record<string, 'Admin' | 'Member' | 'Viewer'>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync selected members and roles when currentTeamMembers changes
  useEffect(() => {
    if (isOpen) {
      setSelectedMembers(currentTeamMembers || []);
      const roleMap: Record<string, 'Admin' | 'Member' | 'Viewer'> = {};
      (currentMembers || []).forEach((m) => {
        const role = m.projectRole || m.role || 'Member';
        roleMap[m.userId] = role;
      });
      // Fallbacks
      (currentTeamMembers || []).forEach((uid) => {
        if (!roleMap[uid]) {
          roleMap[uid] = 'Member';
        }
      });
      setMemberRoles(roleMap);
      setSearchQuery('');
      setError(null);
    }
  }, [isOpen, currentTeamMembers, currentMembers]);

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

  const allWorkspaceMembers = activeWorkspace?.members || [];

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return allWorkspaceMembers;
    const q = searchQuery.toLowerCase().trim();
    return allWorkspaceMembers.filter((m) => {
      const name = (m.name || '').toLowerCase();
      const email = (m.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [allWorkspaceMembers, searchQuery]);

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      } else {
        if (!memberRoles[memberId]) {
          setMemberRoles((roles) => ({ ...roles, [memberId]: 'Member' }));
        }
        return [...prev, memberId];
      }
    });
  };

  const handleRoleChange = (memberId: string, role: 'Admin' | 'Member' | 'Viewer') => {
    setMemberRoles((prev) => ({ ...prev, [memberId]: role }));
  };

  const handleSelectAll = () => {
    if (selectedMembers.length === allWorkspaceMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(allWorkspaceMembers.map((m) => m.userId));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const token = await getToken();
      if (!token) {
        setError('Authentication session expired. Please sign in again.');
        return;
      }

      const payloadMembers = selectedMembers.map((uid) => ({
        userId: uid,
        role: memberRoles[uid] || 'Member',
      }));

      const updated = await updateProjectApi(
        projectId,
        {
          teamMembers: selectedMembers,
          members: payloadMembers,
        },
        token
      );

      onTeamUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update project team roster');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-3xl bg-[#141820]/95 backdrop-blur-2xl border border-white/[0.12] p-6 sm:p-7 shadow-2xl text-zinc-100 transition-all z-10 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#d8f870]/10 border border-[#d8f870]/20 text-[#d8f870]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <span>Manage Project Team</span>
              </h2>
              <p className="text-xs text-zinc-400 truncate max-w-xs sm:max-w-sm">
                Assign workspace members to <span className="text-zinc-200 font-semibold">{projectName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Member Search & Quick Toggle */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search members by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#1b1f26] border border-zinc-700/80 text-zinc-100 text-xs placeholder-zinc-500 focus:outline-none focus:border-[#d8f870] transition-colors"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
            <span>
              <strong className="text-zinc-200">{selectedMembers.length}</strong> of{' '}
              {allWorkspaceMembers.length} members assigned
            </span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[#d8f870] hover:underline text-[11px] font-medium"
            >
              {selectedMembers.length === allWorkspaceMembers.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Members List */}
          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 scrollbar-none">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((m) => {
                const isSelected = selectedMembers.includes(m.userId);
                const isCurrentUser = m.userId === user?.id;
                const displayName = isCurrentUser
                  ? `${user?.fullName || m.name || 'You'} (You)`
                  : (m.name || m.email || 'Workspace Member');
                const avatarUrl = isCurrentUser ? (user?.imageUrl || m.imageUrl) : m.imageUrl;
                const initials = (m.name || m.email || 'U').slice(0, 2).toUpperCase();

                return (
                  <div
                    key={m.userId}
                    onClick={() => toggleMember(m.userId)}
                    className={cn(
                      'flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer select-none',
                      isSelected
                        ? 'bg-[#d8f870]/10 border-[#d8f870]/40 text-zinc-100 shadow-sm'
                        : 'bg-[#1b1f26]/60 border-zinc-800 text-zinc-400 hover:bg-[#1b1f26] hover:border-zinc-700 hover:text-zinc-200'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden font-bold text-[11px] text-[#d8f870]">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={cn('text-xs font-semibold truncate', isSelected ? 'text-zinc-100' : 'text-zinc-300')}>
                          {displayName}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate font-mono">
                          {m.email || m.userId}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSelected && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center"
                        >
                          <select
                            value={memberRoles[m.userId] || 'Member'}
                            onChange={(e) => {
                              handleRoleChange(m.userId, e.target.value as any);
                            }}
                            className={cn(
                              'text-[10px] font-bold px-2 py-1 rounded-lg border focus:outline-none transition-colors cursor-pointer',
                              memberRoles[m.userId] === 'Admin'
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                                : memberRoles[m.userId] === 'Viewer'
                                ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
                                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                            )}
                          >
                            <option value="Admin" className="bg-zinc-900 text-amber-300">Admin / PM</option>
                            <option value="Member" className="bg-zinc-900 text-emerald-300">Contributor</option>
                            <option value="Viewer" className="bg-zinc-900 text-blue-300">Viewer</option>
                          </select>
                        </div>
                      )}

                      <div
                        className={cn(
                          'w-5 h-5 rounded-lg flex items-center justify-center border transition-all',
                          isSelected
                            ? 'bg-[#d8f870] border-[#d8f870] text-zinc-950 font-bold'
                            : 'border-zinc-700 bg-transparent text-transparent'
                        )}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-zinc-500 text-xs">
                No matching members found in workspace.
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-[#d8f870] hover:bg-[#cbf05b] text-zinc-950 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Team Roster</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
