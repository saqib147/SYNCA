'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronsUpDown,
  Check,
  Plus,
  KeyRound,
  Building2,
  ExternalLink,
  Users,
  Settings,
  LogOut,
  Mail,
  User,
  Shield,
} from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useUser, useClerk } from '@clerk/nextjs';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';
import { JoinWorkspaceModal } from './JoinWorkspaceModal';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { cn } from '@/lib/utils';
import { Workspace } from '@synca/types';

export function WorkspaceSwitcher() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { workspaces, activeWorkspace, setActiveWorkspace, isLoading, userRole } = useWorkspace();

  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const getWorkspaceInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const handleSelectWorkspace = (workspace: Workspace) => {
    setActiveWorkspace(workspace);
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        {/* Merged Trigger Card */}
        {!isLoaded ? (
          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#1e232b] border border-zinc-800/80 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-zinc-800 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-zinc-800 rounded w-3/4" />
              <div className="h-2.5 bg-zinc-800 rounded w-1/2" />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'w-full flex items-center gap-3 p-2.5 rounded-2xl bg-[#1e232b] hover:bg-[#222832] border transition-all text-left group cursor-pointer shadow-sm',
              isOpen
                ? 'border-[#d8f870]/70 ring-1 ring-[#d8f870]/30'
                : 'border-zinc-800/90 hover:border-zinc-700/90'
            )}
          >
            {/* User Avatar with online indicator */}
            <div className="relative shrink-0">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.fullName || 'User avatar'}
                  className="w-10 h-10 rounded-full border-2 border-[#d8f870] object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#d8f870] text-zinc-950 font-bold text-sm flex items-center justify-center">
                  {user?.firstName?.charAt(0) || user?.emailAddresses?.[0]?.emailAddress?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#16191e]" />
            </div>

            {/* Name & Active Workspace */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-white truncate leading-tight">
                {user?.fullName || user?.username || 'Synca User'}
              </h4>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 truncate mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d8f870] shrink-0" />
                <span className="truncate font-medium text-zinc-300">
                  {isLoading
                    ? 'Loading...'
                    : activeWorkspace
                    ? activeWorkspace.name
                    : 'Select Workspace'}
                </span>
              </div>
            </div>

            {/* Chevron Icon */}
            <ChevronsUpDown className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 shrink-0 transition-colors" />
          </button>
        )}

        {/* Right Flyout Popover Menu */}
        {isOpen && (
          <div className="absolute left-[calc(100%+0.75rem)] top-0 w-80 bg-[#12151d] dark:bg-[#0b0e14] border border-zinc-700/80 dark:border-zinc-800 rounded-3xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.9)] z-50 text-white animate-in fade-in slide-in-from-left-2 duration-150">
            {/* User Profile Section */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/90 dark:bg-[#141822] border border-zinc-800 dark:border-zinc-700/50">
              <div className="relative shrink-0">
                {user?.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt={user.fullName || 'User avatar'}
                    className="w-11 h-11 rounded-full border-2 border-[#d8f870] object-cover"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[#d8f870] text-zinc-950 font-bold text-base flex items-center justify-center">
                    {user?.firstName?.charAt(0) || 'U'}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#141822]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-zinc-100 truncate">
                  {user?.fullName || user?.username || 'Synca User'}
                </h3>
                <p className="text-xs text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3 text-zinc-500 shrink-0" />
                  <span className="truncate">{user?.primaryEmailAddress?.emailAddress || 'User Account'}</span>
                </p>
              </div>
            </div>

            <div className="h-px bg-zinc-800 my-3" />

            {/* Workspaces List Section */}
            <div className="space-y-1.5">
              <div className="px-2 py-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                <span>Your Workspaces</span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-bold">
                  {workspaces.length}
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 py-0.5 scrollbar-thin">
                {workspaces.length === 0 ? (
                  <div className="p-3 text-center text-xs text-zinc-400 bg-zinc-900/50 dark:bg-black/30 border border-zinc-800/60 rounded-xl">
                    No workspaces found. Create or join one below.
                  </div>
                ) : (
                  workspaces.map((ws) => {
                    const isSelected = activeWorkspace?._id === ws._id;
                    return (
                      <button
                        key={ws._id}
                        type="button"
                        onClick={() => handleSelectWorkspace(ws)}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all text-xs group cursor-pointer',
                          isSelected
                            ? 'bg-zinc-800 text-white border border-[#d8f870]/40 font-medium'
                            : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-white'
                        )}
                      >
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#d8f870] to-[#8be6c1] text-zinc-950 text-[10px] font-bold flex items-center justify-center shrink-0 shadow-sm">
                          {getWorkspaceInitials(ws.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-xs font-semibold">{ws.name}</p>
                          <p className="text-[10px] text-zinc-400 truncate">
                            {ws.members?.length || 1} {(ws.members?.length || 1) === 1 ? 'member' : 'members'}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-[#d8f870] shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="h-px bg-zinc-800 my-3" />

            {/* Quick Actions */}
            <div className="space-y-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowCreateModal(true);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800/70 transition-colors"
              >
                <Plus className="w-4 h-4 text-[#d8f870]" />
                <span className="font-medium">Create Workspace</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowJoinModal(true);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800/70 transition-colors"
              >
                <KeyRound className="w-4 h-4 text-[#8be6c1]" />
                <span className="font-medium">Join with Code</span>
              </button>

              {activeWorkspace && (
                <Link
                  href={`/workspaces/${activeWorkspace._id}`}
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-zinc-400" />
                    <span className="font-medium">Manage Workspace</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
                </Link>
              )}
            </div>

            <div className="h-px bg-zinc-800 my-3" />

            {/* Footer Navigation: Theme, Settings & Sign Out */}
            <div className="space-y-0.5 text-xs">
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl text-zinc-400">
                <span className="font-medium">Theme Mode</span>
                <ThemeToggle size="sm" />
              </div>
              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70 transition-colors"
              >
                <Settings className="w-4 h-4 text-zinc-400" />
                <span className="font-medium">Settings</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  signOut();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span className="font-medium">Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals rendered via Portal directly to body */}
      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
      <JoinWorkspaceModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
      />
    </>
  );
}
