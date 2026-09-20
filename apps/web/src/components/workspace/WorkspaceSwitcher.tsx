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
  ShieldAlert,
  Users,
} from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';
import { JoinWorkspaceModal } from './JoinWorkspaceModal';
import { cn } from '@/lib/utils';
import { Workspace } from '@synca/types';

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, setActiveWorkspace, isLoading, userRole } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
      <div className="relative" ref={dropdownRef}>
        {/* Trigger Button */}
        {isLoading ? (
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-[#1e232b] border border-zinc-800 animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-zinc-800 rounded w-2/3" />
              <div className="h-2 bg-zinc-800 rounded w-1/3" />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center gap-2.5 p-2 rounded-2xl bg-[#1e232b] hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-zinc-700/80 transition-all text-left group"
          >
            {/* Workspace Avatar */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#d8f870] to-[#8be6c1] text-zinc-950 font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
              {activeWorkspace ? getWorkspaceInitials(activeWorkspace.name) : <Building2 className="w-4 h-4 text-zinc-900" />}
            </div>

            {/* Workspace Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-100 truncate block group-hover:text-white">
                  {activeWorkspace ? activeWorkspace.name : 'Select Workspace'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                {activeWorkspace ? (
                  <>
                    <span className="capitalize text-[#d8f870] font-medium">{userRole || 'Member'}</span>
                    <span>•</span>
                    <span>{activeWorkspace.members?.length || 1} {activeWorkspace.members?.length === 1 ? 'member' : 'members'}</span>
                  </>
                ) : (
                  <span>Click to choose or create</span>
                )}
              </div>
            </div>

            {/* Switcher Indicator */}
            <ChevronsUpDown className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors shrink-0" />
          </button>
        )}

        {/* Dropdown Popover */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-[#16191e] border border-zinc-800 rounded-2xl p-2 shadow-2xl z-40 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header */}
            <div className="px-2 py-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              <span>Workspaces</span>
              <span className="px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-normal">
                {workspaces.length}
              </span>
            </div>

            {/* Workspace List */}
            <div className="max-h-48 overflow-y-auto space-y-1 py-1 scrollbar-thin scrollbar-thumb-zinc-800">
              {workspaces.length === 0 ? (
                <div className="p-3 text-center text-xs text-zinc-500">
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
                        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors text-xs group',
                        isSelected
                          ? 'bg-[#1e232b] text-white font-medium'
                          : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white'
                      )}
                    >
                      <div className="w-6 h-6 rounded-lg bg-zinc-800 group-hover:bg-zinc-700 text-zinc-200 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {getWorkspaceInitials(ws.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs">{ws.name}</p>
                        <p className="text-[10px] text-zinc-500 truncate">
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

            <div className="h-px bg-zinc-800 my-1.5" />

            {/* Quick Actions */}
            <div className="space-y-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowCreateModal(true);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-[#d8f870]" />
                <span>Create Workspace</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowJoinModal(true);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#8be6c1]" />
                <span>Join with Code</span>
              </button>

              {activeWorkspace && (
                <Link
                  href={`/workspaces/${activeWorkspace._id}`}
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <Users className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Manage Workspace</span>
                  </span>
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
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
