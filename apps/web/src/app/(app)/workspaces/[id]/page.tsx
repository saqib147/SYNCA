'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useUser } from '@clerk/nextjs';
import {
  Building2,
  Copy,
  Check,
  Users,
  Settings2,
  Lock,
  Globe,
  Trash2,
  LogOut,
  ChevronLeft,
  Shield,
  ShieldCheck,
  UserCheck,
  Calendar,
  Sparkles,
  Loader2,
  Search,
  AlertTriangle,
} from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Workspace, WorkspaceMember, WorkspaceRole } from '@synca/types';
import { fetchWorkspaceById, removeMemberApi } from '@/lib/api/workspace.api';
import { cn } from '@/lib/utils';

export default function WorkspaceOverviewPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const {
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    updateWorkspace,
    deleteWorkspace,
    leaveWorkspace,
    refreshWorkspaces,
  } = useWorkspace();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roster' | 'settings'>('roster');

  // Copy code state
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Settings form state
  const [settingsName, setSettingsName] = useState('');
  const [settingsDesc, setSettingsDesc] = useState('');
  const [settingsIsPrivate, setSettingsIsPrivate] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Member search & removal
  const [searchMember, setSearchMember] = useState('');
  const [isRemovingMember, setIsRemovingMember] = useState<string | null>(null);

  // Danger actions
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Resolve current workspace from context or direct API fetch
  useEffect(() => {
    let isMounted = true;

    async function loadTargetWorkspace() {
      // 1. Try finding in loaded context workspaces
      const matched = workspaces.find((w) => w._id === id || w.slug === id);
      if (matched) {
        if (isMounted) {
          setWorkspace(matched);
          setSettingsName(matched.name);
          setSettingsDesc(matched.description || '');
          setSettingsIsPrivate(matched.isPrivate);
          setIsLoading(false);
        }
        return;
      }

      // 2. Otherwise fetch from API
      try {
        setIsLoading(true);
        const token = await getToken();
        if (!token) {
          setIsLoading(false);
          return;
        }
        const fetched = await fetchWorkspaceById(id, token);
        if (isMounted && fetched) {
          setWorkspace(fetched);
          setSettingsName(fetched.name);
          setSettingsDesc(fetched.description || '');
          setSettingsIsPrivate(fetched.isPrivate);
        }
      } catch (err) {
        console.error('Failed to load workspace:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadTargetWorkspace();

    return () => {
      isMounted = false;
    };
  }, [id, workspaces, getToken]);

  // Derive current user's role in this workspace
  const currentUserRole = useMemo<WorkspaceRole | null>(() => {
    if (!workspace || !userId) return null;
    const member = workspace.members.find((m) => m.userId === userId);
    return member?.role || null;
  }, [workspace, userId]);

  const isOwner = currentUserRole === 'owner';
  const isAdmin = currentUserRole === 'admin' || isOwner;

  // Copy helper
  const handleCopyCode = async () => {
    if (!workspace?.joinCode) return;
    try {
      await navigator.clipboard.writeText(workspace.joinCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Failed to copy join code:', err);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    try {
      setIsSavingSettings(true);
      setSettingsError(null);
      setSettingsSuccess(false);

      const updated = await updateWorkspace(workspace._id, {
        name: settingsName.trim(),
        description: settingsDesc.trim() || undefined,
        isPrivate: settingsIsPrivate,
      });

      setWorkspace(updated);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err: any) {
      setSettingsError(err?.message || 'Failed to update workspace settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Remove Member
  const handleRemoveMember = async (targetUserId: string) => {
    if (!workspace) return;
    try {
      setIsRemovingMember(targetUserId);
      const token = await getToken();
      if (!token) return;

      await removeMemberApi(workspace._id, targetUserId, token);
      // Update local workspace state
      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.filter((m) => m.userId !== targetUserId),
            }
          : null
      );
      await refreshWorkspaces();
    } catch (err: any) {
      alert(err?.message || 'Failed to remove member.');
    } finally {
      setIsRemovingMember(null);
    }
  };

  // Delete Workspace
  const handleDeleteWorkspace = async () => {
    if (!workspace) return;
    try {
      setIsDeleting(true);
      await deleteWorkspace(workspace._id);
      router.push('/dashboard');
    } catch (err: any) {
      alert(err?.message || 'Failed to delete workspace.');
      setIsDeleting(false);
    }
  };

  // Leave Workspace
  const handleLeaveWorkspace = async () => {
    if (!workspace) return;
    try {
      setIsLeaving(true);
      await leaveWorkspace(workspace._id);
      router.push('/dashboard');
    } catch (err: any) {
      alert(err?.message || 'Failed to leave workspace.');
      setIsLeaving(false);
    }
  };

  // Filtered members list
  const filteredMembers = useMemo(() => {
    if (!workspace?.members) return [];
    if (!searchMember.trim()) return workspace.members;
    const q = searchMember.toLowerCase();
    return workspace.members.filter(
      (m) =>
        m.userId.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q)
    );
  }, [workspace, searchMember]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 text-[#d8f870] animate-spin" />
        <p className="text-xs text-zinc-500 font-medium">Loading workspace details...</p>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-zinc-200 text-center space-y-4 max-w-md mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
          <Building2 className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-zinc-900">Workspace Not Found</h3>
        <p className="text-xs text-zinc-500">
          The workspace you are looking for may have been deleted, or you may not be a member of it.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    );
  }

  const isCurrentActive = activeWorkspace?._id === workspace._id;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        {!isCurrentActive && (
          <button
            onClick={() => setActiveWorkspace(workspace)}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#d8f870] hover:bg-[#c4ea48] text-zinc-900 shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Switch to this Workspace</span>
          </button>
        )}
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            {/* Workspace Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#d8f870] to-[#8be6c1] text-zinc-950 font-bold text-2xl flex items-center justify-center shrink-0 shadow-md">
              {workspace.name.slice(0, 2).toUpperCase()}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
                  {workspace.name}
                </h1>
                {/* Privacy Badge */}
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                  {workspace.isPrivate ? (
                    <>
                      <Lock className="w-3 h-3 text-amber-500" />
                      <span>Private</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-3 h-3 text-emerald-500" />
                      <span>Public</span>
                    </>
                  )}
                </span>
                {/* Active Indicator */}
                {isCurrentActive && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Active Workspace</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 max-w-xl">
                {workspace.description || 'No description provided for this workspace.'}
              </p>
              <div className="flex items-center gap-4 text-xs text-zinc-400 pt-1">
                <span>Slug: <strong className="text-zinc-600 font-mono">/{workspace.slug}</strong></span>
                <span>•</span>
                <span>Role: <strong className="text-[#3cae81] capitalize">{currentUserRole || 'Member'}</strong></span>
              </div>
            </div>
          </div>

          {/* Join Code Widget */}
          <div className="bg-[#16191e] rounded-2xl p-4 text-white sm:min-w-[240px] shadow-inner border border-zinc-800 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Workspace Invite Code
              </span>
              <span className="w-2 h-2 rounded-full bg-[#d8f870]" />
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-xl font-mono font-bold tracking-[0.25em] text-[#d8f870]">
                {workspace.joinCode}
              </span>
              <button
                onClick={handleCopyCode}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all',
                  copiedCode
                    ? 'bg-emerald-500 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                )}
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">
              Share with colleagues to join this workspace.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-8 pt-4 border-t border-zinc-100">
          <button
            onClick={() => setActiveTab('roster')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all',
              activeTab === 'roster'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Members & Roster</span>
            <span className={cn(
              'px-1.5 py-0.2 rounded-full text-[10px]',
              activeTab === 'roster' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-700'
            )}>
              {workspace.members.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all',
              activeTab === 'settings'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            )}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Workspace Settings</span>
          </button>
        </div>
      </div>

      {/* Tab Content: Members & Roster */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Workspace Members</h2>
              <p className="text-xs text-zinc-500">
                All teammates with access to projects and discussions in this workspace.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter members..."
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#8be6c1] focus:border-[#8be6c1]"
              />
            </div>
          </div>

          {/* Members Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-semibold">User</th>
                  <th className="pb-3 font-semibold">Role</th>
                  <th className="pb-3 font-semibold">Joined Date</th>
                  {isAdmin && <th className="pb-3 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredMembers.map((member) => {
                  const isCurrent = member.userId === userId;
                  const isOwnerMember = member.role === 'owner';
                  return (
                    <tr key={member.userId} className="hover:bg-zinc-50/70 transition-colors">
                      {/* User Info */}
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 text-[#d8f870] font-bold text-xs flex items-center justify-center shrink-0">
                            {member.userId.slice(-2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-900 flex items-center gap-1.5">
                              <span>User ({member.userId.slice(0, 10)}...)</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded-full bg-[#d8f870]/30 text-zinc-800 text-[10px] font-bold">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-zinc-400 font-mono">{member.userId}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 pr-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize',
                            member.role === 'owner'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : member.role === 'admin'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                          )}
                        >
                          {member.role === 'owner' ? (
                            <Shield className="w-3 h-3 text-amber-600" />
                          ) : member.role === 'admin' ? (
                            <ShieldCheck className="w-3 h-3 text-indigo-600" />
                          ) : (
                            <UserCheck className="w-3 h-3 text-zinc-500" />
                          )}
                          <span>{member.role}</span>
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 pr-4 text-zinc-500">
                        {new Date(member.joinedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      {isAdmin && (
                        <td className="py-3.5 text-right">
                          {!isOwnerMember && !isCurrent ? (
                            <button
                              onClick={() => handleRemoveMember(member.userId)}
                              disabled={isRemovingMember === member.userId}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                            >
                              {isRemovingMember === member.userId ? 'Removing...' : 'Remove'}
                            </button>
                          ) : (
                            <span className="text-zinc-300 text-[11px]">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Workspace Settings */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* General Settings */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">General Settings</h2>
              <p className="text-xs text-zinc-500">
                Update details for this workspace. Only workspace admins can make edits.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-5 max-w-xl">
              {settingsSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Workspace settings updated successfully!</span>
                </div>
              )}

              {settingsError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span>{settingsError}</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-800">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  disabled={!isAdmin}
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#8be6c1] focus:border-[#8be6c1] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-800">
                  Description
                </label>
                <textarea
                  rows={3}
                  disabled={!isAdmin}
                  value={settingsDesc}
                  onChange={(e) => setSettingsDesc(e.target.value)}
                  placeholder="Describe your workspace goals or team function..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#8be6c1] focus:border-[#8be6c1] disabled:opacity-60 disabled:cursor-not-allowed transition-all resize-none"
                />
              </div>

              {/* Privacy Setting */}
              <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {settingsIsPrivate ? (
                    <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <Globe className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-zinc-800">
                      {settingsIsPrivate ? 'Private Workspace' : 'Public Workspace'}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {settingsIsPrivate
                        ? 'Restricted to explicit members and join code holders.'
                        : 'Discoverable to members inside the system.'}
                    </p>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setSettingsIsPrivate(!settingsIsPrivate)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settingsIsPrivate ? 'bg-[#3cae81]' : 'bg-zinc-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        settingsIsPrivate ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                )}
              </div>

              {isAdmin && (
                <button
                  type="submit"
                  disabled={isSavingSettings || !settingsName.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#d8f870] hover:bg-[#c4ea48] text-zinc-900 flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
                >
                  {isSavingSettings ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              )}
            </form>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-rose-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="text-base font-bold">Danger Zone</h2>
            </div>

            <div className="divide-y divide-zinc-100">
              {/* Leave Workspace (For non-owners) */}
              {!isOwner && (
                <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900">Leave Workspace</h3>
                    <p className="text-xs text-zinc-500">
                      Revoke your membership and access to this workspace.
                    </p>
                  </div>

                  {showLeaveConfirm ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowLeaveConfirm(false)}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleLeaveWorkspace}
                        disabled={isLeaving}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        {isLeaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                        <span>Confirm Leave</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowLeaveConfirm(true)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors"
                    >
                      Leave Workspace
                    </button>
                  )}
                </div>
              )}

              {/* Delete Workspace (For owner) */}
              {isOwner && (
                <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900">Delete Workspace</h3>
                    <p className="text-xs text-zinc-500">
                      Permanently delete this workspace and remove all associated projects and tasks.
                    </p>
                  </div>

                  {showDeleteConfirm ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteWorkspace}
                        disabled={isDeleting}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        <span>Confirm Delete</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                    >
                      Delete Workspace
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
