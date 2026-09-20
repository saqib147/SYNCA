'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FolderKanban, Lock, Globe, Loader2, Sparkles, Users, Check } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useWorkspace } from '@/hooks/useWorkspace';
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
  const { activeWorkspace } = useWorkspace();
  const { user } = useUser();

  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('ActiveSprint');
  const [privacy, setPrivacy] = useState<ProjectPrivacy>('RoomWide');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberRoles, setMemberRoles] = useState<Record<string, 'Admin' | 'Member' | 'Viewer'>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pre-select creator with Admin role
  useEffect(() => {
    if (user?.id && selectedMembers.length === 0) {
      setSelectedMembers([user.id]);
      setMemberRoles({ [user.id]: 'Admin' });
    }
  }, [user?.id]);

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

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        if (!memberRoles[userId]) {
          setMemberRoles((roles) => ({
            ...roles,
            [userId]: userId === user?.id ? 'Admin' : 'Member',
          }));
        }
        return [...prev, userId];
      }
    });
  };

  const handleRoleChange = (userId: string, role: 'Admin' | 'Member' | 'Viewer') => {
    setMemberRoles((prev) => ({ ...prev, [userId]: role }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const membersPayload = selectedMembers.map((uid) => ({
      userId: uid,
      role: uid === user?.id ? 'Admin' : (memberRoles[uid] || 'Member'),
    }));

    const validation = createProjectSchema.safeParse({
      name: name.trim(),
      description: description.trim() || undefined,
      status,
      privacy,
      teamMembers: selectedMembers,
      members: membersPayload,
    });

    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Invalid project details';
      setError(firstError);
      return;
    }

    try {
      setIsSubmitting(true);
      const newProj = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        privacy,
        teamMembers: selectedMembers,
        members: membersPayload,
      });

      setName('');
      setDescription('');
      setStatus('ActiveSprint');
      setPrivacy('RoomWide');
      setSelectedMembers(user?.id ? [user.id] : []);
      setMemberRoles(user?.id ? { [user.id]: 'Admin' } : {});
      onClose();
      if (onCreated && newProj?._id) {
        onCreated(newProj._id);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create project. Please try again.');
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
        className="w-full max-w-lg bg-[#16191e] border border-zinc-700/80 rounded-3xl p-6 sm:p-7 text-white shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-[#d8f870]/12 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#d8f870]/15 border border-[#d8f870]/30 flex items-center justify-center text-[#d8f870] shadow-sm">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">Create Project</h3>
              <p className="text-xs text-zinc-400">
                Start a collaborative initiative in {activeWorkspace?.name || 'this workspace'}
              </p>
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
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Project Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Project Name <span className="text-[#d8f870]">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Mobile App Redesign, Cloud Migration"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="w-full px-4 py-2.5 rounded-xl bg-[#1b1f26] border border-zinc-700/80 text-zinc-100 text-xs placeholder-zinc-500 focus:outline-none focus:border-[#d8f870] focus:ring-1 focus:ring-[#d8f870] transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Description <span className="text-zinc-500 font-normal text-[11px]">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Brief summary of goals, scope, and key milestones..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              className="w-full px-4 py-2.5 rounded-xl bg-[#1b1f26] border border-zinc-700/80 text-zinc-100 text-xs placeholder-zinc-500 focus:outline-none focus:border-[#d8f870] focus:ring-1 focus:ring-[#d8f870] transition-colors resize-none"
            />
          </div>

          {/* Status Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Initial Status</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'ActiveSprint', label: 'Active Sprint', color: 'border-zinc-500 bg-zinc-800/80 text-zinc-200' },
                { id: 'OnTrack', label: 'On Track', color: 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300' },
                { id: 'AtRisk', label: 'At Risk', color: 'border-rose-500/50 bg-rose-950/30 text-rose-300' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStatus(item.id as ProjectStatus)}
                  className={cn(
                    'p-2 rounded-xl text-xs font-medium border text-center transition-all',
                    status === item.id
                      ? 'border-[#d8f870] bg-[#d8f870]/10 text-[#d8f870] font-bold shadow-sm'
                      : 'border-zinc-800 bg-[#1b1f26] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy Toggle */}
          <div className="p-3.5 rounded-2xl bg-[#1b1f26] border border-zinc-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-zinc-800/80">
                  {privacy === 'Private' ? (
                    <Lock className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Globe className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-200">
                    {privacy === 'Private' ? 'Private Project' : 'Workspace-Wide Project'}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {privacy === 'Private'
                      ? 'Only explicitly added team members can access'
                      : 'All members of this workspace can view and collaborate'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrivacy(privacy === 'Private' ? 'RoomWide' : 'Private')}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  privacy === 'Private' ? 'bg-[#d8f870]' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-zinc-950 shadow-lg ring-0 transition duration-200 ease-in-out ${
                    privacy === 'Private' ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Team Members Picker */}
          {activeWorkspace?.members && activeWorkspace.members.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>Assign Team Members & Roles</span>
                <span className="text-zinc-500 text-[11px]">
                  {selectedMembers.length} selected
                </span>
              </label>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2.5 bg-[#1b1f26] border border-zinc-700/80 rounded-xl">
                {activeWorkspace.members.map((m) => {
                  const isSelected = selectedMembers.includes(m.userId);
                  const isCurrentUser = m.userId === user?.id;
                  const displayName = isCurrentUser
                    ? (user?.fullName || m.name || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'You')
                    : (m.name || m.email || `Member`);
                  const avatarUrl = isCurrentUser ? (user?.imageUrl || m.imageUrl) : m.imageUrl;
                  const initials = displayName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div
                      key={m.userId}
                      className={cn(
                        'flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs transition-all border select-none',
                        isSelected
                          ? 'bg-zinc-800 border-[#d8f870]/60 text-zinc-100 shadow-sm'
                          : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/60 hover:bg-zinc-700/80 hover:text-white'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleMember(m.userId)}
                        className="flex items-center gap-2 text-left"
                      >
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={displayName}
                            className="w-4 h-4 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-zinc-700 text-zinc-300 flex items-center justify-center text-[9px] font-bold shrink-0">
                            {initials}
                          </div>
                        )}
                        <span className={cn('text-xs', isSelected ? 'font-semibold text-zinc-100' : 'text-zinc-300')}>
                          {displayName}{isCurrentUser ? ' (You)' : ''}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#d8f870] shrink-0" />}
                      </button>

                      {isSelected && (
                        isCurrentUser ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                            Admin
                          </span>
                        ) : (
                          <select
                            value={memberRoles[m.userId] || 'Member'}
                            onChange={(e) => handleRoleChange(m.userId, e.target.value as any)}
                            className={cn(
                              'text-[10px] font-bold px-1.5 py-0.5 rounded border focus:outline-none transition-colors cursor-pointer shrink-0',
                              memberRoles[m.userId] === 'Admin'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : memberRoles[m.userId] === 'Viewer'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            )}
                          >
                            <option value="Admin" className="bg-zinc-900 text-amber-300">Admin</option>
                            <option value="Member" className="bg-zinc-900 text-emerald-300">Contributor</option>
                            <option value="Viewer" className="bg-zinc-900 text-blue-300">Viewer</option>
                          </select>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                  <span>Create Project</span>
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
