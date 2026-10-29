'use client';

import React, { useState, useMemo } from 'react';
import { Search, Hash, MessageSquare, Users, Sparkles, FolderKanban, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { Project } from '@synca/types';
import { useSocket } from '@/context/SocketContext';
import { useChatNotifications } from '@/context/ChatNotificationContext';
import { useTeammates } from '@/hooks/useTeammates';
import { cn } from '@/lib/utils';

export interface ConversationTarget {
  type: 'channel' | 'dm';
  id: string; // projectId for channel, peerUserId for dm
  name: string;
  avatarUrl?: string;
  subtitle?: string;
  isOnline?: boolean;
}

interface ChatSidebarProps {
  projects: Project[];
  activeTarget: ConversationTarget | null;
  onSelectTarget: (target: ConversationTarget) => void;
  currentUserId?: string;
}

export function ChatSidebar({
  projects,
  activeTarget,
  onSelectTarget,
  currentUserId,
}: ChatSidebarProps) {
  const [activeTab, setActiveTab] = useState<'dm' | 'channel'>(() => activeTarget?.type || 'dm');
  const [search, setSearch] = useState('');
  const { onlineUsers } = useSocket();
  const { unreadCounts, markAsRead } = useChatNotifications();
  const { teammates } = useTeammates();
  const teamMembers = teammates;

  // Total unreads per category
  const dmUnreads = useMemo(() => {
    return Object.entries(unreadCounts).reduce((acc, [key, count]) => {
      if (key.startsWith('dm_')) return acc + count;
      return acc;
    }, 0);
  }, [unreadCounts]);

  const channelUnreads = useMemo(() => {
    return Object.entries(unreadCounts).reduce((acc, [key, count]) => {
      if (key.startsWith('channel_')) return acc + count;
      return acc;
    }, 0);
  }, [unreadCounts]);

  // Filtered lists
  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [projects, search]);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return teamMembers;
    return teamMembers.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));
  }, [teamMembers, search]);

  const handleSelect = (target: ConversationTarget) => {
    const key = target.type === 'channel' ? `channel_${target.id}` : `dm_${target.id}`;
    markAsRead(key);
    onSelectTarget(target);
  };

  return (
    <div className="w-80 border-r border-zinc-200/80 dark:border-white/[0.08] flex flex-col h-full bg-zinc-50/50 dark:bg-white/[0.02]">
      {/* 1. Header & Segmented Separation Switcher */}
      <div className="p-4 border-b border-zinc-200/80 dark:border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-500" />
            <span>Messages Hub</span>
          </h2>
        </div>

        {/* Segmented Switcher (1:1 DMs vs Project Channels) */}
        <div className="grid grid-cols-2 p-1 bg-zinc-200/60 dark:bg-zinc-800/80 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('dm')}
            className={cn(
              'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all relative',
              activeTab === 'dm'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Direct</span>
            {dmUnreads > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-bold text-[10px]">
                {dmUnreads}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('channel')}
            className={cn(
              'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all relative',
              activeTab === 'channel'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            )}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Projects</span>
            {channelUnreads > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-bold text-[10px]">
                {channelUnreads}
              </span>
            )}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'dm' ? 'Search team members...' : 'Search project channels...'}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        </div>
      </div>

      {/* 2. Conversations Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        {/* DIRECT MESSAGES VIEW */}
        {activeTab === 'dm' && (
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center justify-between">
              <span>1:1 Conversations</span>
              <span className="text-[10px] font-normal">{filteredMembers.length} teammates</span>
            </div>

            {filteredMembers.map((member) => {
              const isActive = activeTarget?.type === 'dm' && activeTarget.id === member.userId;
              const isOnline = Boolean(onlineUsers[member.userId]);
              const unread = unreadCounts[`dm_${member.userId}`] || 0;

              return (
                <button
                  key={member.userId}
                  onClick={() =>
                    handleSelect({
                      type: 'dm',
                      id: member.userId,
                      name: member.name,
                      subtitle: isOnline ? 'Active now' : 'Offline',
                      avatarUrl: member.avatarUrl,
                      isOnline,
                    })
                  }
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-left text-xs transition-all group relative',
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/25 shadow-2xs'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-800 dark:text-zinc-200 overflow-hidden shadow-sm">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{member.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span
                      className={cn(
                        'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900',
                        isOnline ? 'bg-emerald-500' : 'bg-zinc-400'
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">{member.name}</p>
                      {unread > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-bold text-[10px]">
                          {unread}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                      {isOnline ? 'Active now' : 'Offline'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* PROJECT CHANNELS VIEW */}
        {activeTab === 'channel' && (
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center justify-between">
              <span>Project Channels</span>
              <span className="text-[10px] font-normal">{filteredProjects.length} projects</span>
            </div>

            {filteredProjects.length > 0 ? (
              filteredProjects.map((proj) => {
                const isActive = activeTarget?.type === 'channel' && activeTarget.id === String(proj._id);
                const unread = unreadCounts[`channel_${String(proj._id)}`] || 0;

                return (
                  <div key={String(proj._id)} className="relative group">
                    <button
                      onClick={() =>
                        handleSelect({
                          type: 'channel',
                          id: String(proj._id),
                          name: `${proj.name} — #general`,
                          subtitle: proj.description || 'Project Channel',
                        })
                      }
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-left text-xs transition-all',
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/25 shadow-2xs'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                      )}
                    >
                      <div
                        className={cn(
                          'p-2 rounded-xl transition-colors',
                          isActive
                            ? 'bg-emerald-500 text-white'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100'
                        )}
                      >
                        <Hash className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">{proj.name}</p>
                          {unread > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-bold text-[10px]">
                              {unread}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                          #general • {proj.teamMembers?.length || 1} members
                        </p>
                      </div>
                    </button>
                    {/* Direct link to Project Workspace */}
                    <Link
                      href={`/projects/${proj._id}?tab=conversation`}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-400 hover:text-emerald-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                      title="Open in Project Workspace"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })
            ) : (
              <p className="text-[11px] text-zinc-400 px-3 py-2 italic">No projects joined</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
