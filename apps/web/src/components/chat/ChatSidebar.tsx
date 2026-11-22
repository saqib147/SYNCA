'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Hash,
  Users,
  ArrowUpRight,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { Project } from '@synca/types';
import { useSocket } from '@/context/SocketContext';
import { useChatNotifications } from '@/context/ChatNotificationContext';
import { useTeammates } from '@/hooks/useTeammates';
import { cn } from '@/lib/utils';

export interface ConversationTarget {
  type: 'channel' | 'dm';
  id: string;
  name: string;
  avatarUrl?: string;
  subtitle?: string;
  isOnline?: boolean;
}

interface ChatSidebarProps {
  projects: Project[];
  activeTarget: ConversationTarget | null;
  onSelectTarget: (target: ConversationTarget) => void;
  onOpenNewMessage?: () => void;
  currentUserId?: string;
}

export function ChatSidebar({
  projects,
  activeTarget,
  onSelectTarget,
  onOpenNewMessage,
}: ChatSidebarProps) {
  const [activeTab, setActiveTab] = useState<'dm' | 'channel'>(
    () => activeTarget?.type || 'dm'
  );
  const [search, setSearch] = useState('');
  const { onlineUsers } = useSocket();
  const { unreadCounts, markAsRead } = useChatNotifications();
  const { teammates } = useTeammates();

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

  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    return projects.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [projects, search]);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return teammates;
    return teammates.filter((m) =>
      m.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [teammates, search]);

  const handleSelect = (target: ConversationTarget) => {
    const key =
      target.type === 'channel'
        ? `channel_${target.id}`
        : `dm_${target.id}`;
    markAsRead(key);
    onSelectTarget(target);
  };

  return (
    <div className="w-[300px] border-r border-[#e5e7eb] dark:border-white/[0.08] flex flex-col h-full bg-[#fafafa] dark:bg-[#14171c] shrink-0">
      {/* Header & Switcher */}
      <div className="p-4 border-b border-[#e5e7eb] dark:border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-['Funnel_Display',sans-serif] font-medium text-[19px] text-[#191c1d] dark:text-white">
            Messages
          </h2>
          {onOpenNewMessage && (
            <button
              type="button"
              onClick={onOpenNewMessage}
              title="Start new message"
              className="size-8 rounded-[8px] bg-[#e6f7f1] dark:bg-[#66deb4]/15 hover:bg-[#d3f5e8] dark:hover:bg-[#66deb4]/25 text-[#006c52] dark:text-[#66deb4] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Segmented Switcher */}
        <div className="grid grid-cols-2 p-1 bg-[#e7e8e9]/80 dark:bg-white/[0.06] rounded-[10px] gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('dm')}
            className={cn(
              'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[8px] text-[12.5px] font-medium transition-all cursor-pointer',
              activeTab === 'dm'
                ? 'bg-white dark:bg-[#1e2127] text-[#191c1d] dark:text-white shadow-2xs'
                : 'text-[#3e4944] dark:text-zinc-400 hover:text-[#191c1d] dark:hover:text-zinc-200'
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Direct</span>
            {dmUnreads > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#66deb4] text-[#111316] font-bold text-[10px] leading-none">
                {dmUnreads}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('channel')}
            className={cn(
              'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[8px] text-[12.5px] font-medium transition-all cursor-pointer',
              activeTab === 'channel'
                ? 'bg-white dark:bg-[#1e2127] text-[#191c1d] dark:text-white shadow-2xs'
                : 'text-[#3e4944] dark:text-zinc-400 hover:text-[#191c1d] dark:hover:text-zinc-200'
            )}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Projects</span>
            {channelUnreads > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#66deb4] text-[#111316] font-bold text-[10px] leading-none">
                {channelUnreads}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#3e4944] dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === 'dm'
                ? 'Filter conversations...'
                : 'Filter project channels...'
            }
            className="w-full h-[36px] pl-8 pr-3 rounded-[8px] bg-white dark:bg-white/[0.04] border border-[#bdc9c2] dark:border-white/[0.1] text-[12.5px] text-[#191c1d] dark:text-white placeholder-[#3e4944]/60 dark:placeholder-zinc-500 focus:outline-none focus:border-[#006c52] dark:focus:border-[#66deb4]"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
        {activeTab === 'dm' && (
          <>
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => {
                const isActive =
                  activeTarget?.type === 'dm' &&
                  activeTarget.id === member.userId;
                const isOnline = Boolean(onlineUsers[member.userId]);
                const unread = unreadCounts[`dm_${member.userId}`] || 0;

                return (
                  <button
                    key={member.userId}
                    type="button"
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
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left transition-colors cursor-pointer',
                      isActive
                        ? 'bg-[#eefaf5] dark:bg-[#006c52]/20 border border-[#79deba]/60'
                        : 'border border-transparent hover:bg-white dark:hover:bg-white/[0.04]'
                    )}
                  >
                    <div className="relative shrink-0">
                      <div className="size-9 rounded-full bg-[#e7e8e9] dark:bg-zinc-700 flex items-center justify-center font-semibold text-xs text-[#191c1d] dark:text-zinc-200 overflow-hidden">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="size-full object-cover"
                          />
                        ) : (
                          <span>{member.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <span
                        className={cn(
                          'absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white dark:border-[#14171c]',
                          isOnline ? 'bg-[#3ec99b]' : 'bg-zinc-400'
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13.5px] font-medium text-[#191c1d] dark:text-zinc-100 truncate">
                          {member.name}
                        </p>
                        {unread > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-[#66deb4] text-[#111316] font-bold text-[10px] leading-none">
                            {unread}
                          </span>
                        )}
                      </div>
                      <p className="text-[11.5px] text-[#3e4944]/75 dark:text-zinc-500 truncate mt-0.5">
                        {member.lastMessagePreview ||
                          (isOnline ? 'Active now' : 'Offline')}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-10 px-4 text-center space-y-2.5">
                <p className="text-[13px] font-medium text-[#191c1d] dark:text-zinc-200">
                  No direct conversations yet
                </p>
                <p className="text-[12px] text-[#3e4944] dark:text-zinc-400">
                  Find a teammate or look up someone by exact email to start chatting.
                </p>
                {onOpenNewMessage && (
                  <button
                    type="button"
                    onClick={onOpenNewMessage}
                    className="mt-1 px-3.5 py-2 rounded-[8px] bg-[#006c52] dark:bg-[#66deb4] text-white dark:text-[#111316] text-[12px] font-semibold cursor-pointer"
                  >
                    + New Message
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'channel' && (
          <>
            {filteredProjects.length > 0 ? (
              filteredProjects.map((proj) => {
                const isActive =
                  activeTarget?.type === 'channel' &&
                  activeTarget.id === String(proj._id);
                const unread =
                  unreadCounts[`channel_${String(proj._id)}`] || 0;

                return (
                  <div key={String(proj._id)} className="relative group">
                    <button
                      type="button"
                      onClick={() =>
                        handleSelect({
                          type: 'channel',
                          id: String(proj._id),
                          name: proj.name,
                          subtitle: proj.description || 'Project Channel',
                        })
                      }
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left transition-colors cursor-pointer',
                        isActive
                          ? 'bg-[#eefaf5] dark:bg-[#006c52]/20 border border-[#79deba]/60'
                          : 'border border-transparent hover:bg-white dark:hover:bg-white/[0.04]'
                      )}
                    >
                      <div
                        className={cn(
                          'size-9 rounded-[10px] flex items-center justify-center shrink-0 transition-colors',
                          isActive
                            ? 'bg-[#006c52] dark:bg-[#66deb4] text-white dark:text-[#111316]'
                            : 'bg-[#e7e8e9] dark:bg-white/[0.08] text-[#3e4944] dark:text-zinc-300'
                        )}
                      >
                        <Hash className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0 pr-5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13.5px] font-medium text-[#191c1d] dark:text-zinc-100 truncate">
                            {proj.name}
                          </p>
                          {unread > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-[#66deb4] text-[#111316] font-bold text-[10px] leading-none">
                              {unread}
                            </span>
                          )}
                        </div>
                        <p className="text-[11.5px] text-[#3e4944]/75 dark:text-zinc-500 truncate mt-0.5">
                          {proj.teamMembers?.length || 1} members
                        </p>
                      </div>
                    </button>
                    <Link
                      href={`/projects/${proj._id}?tab=conversation`}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-[6px] text-[#3e4944] hover:text-[#006c52] dark:hover:text-[#66deb4] hover:bg-[#e6f7f1] dark:hover:bg-white/[0.08] transition-all"
                      title="Open in Project Workspace"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })
            ) : (
              <p className="text-[12.5px] text-[#3e4944] dark:text-zinc-500 px-3 py-6 text-center">
                No project channels yet.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
