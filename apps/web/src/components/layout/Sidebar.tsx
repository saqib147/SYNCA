'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  ChevronRight,
  Settings,
  LogOut,
  Plus,
  KeyRound,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useClerk, useAuth } from '@clerk/nextjs';
import { useProjects } from '@/hooks/useProjects';
import { useTeammates } from '@/hooks/useTeammates';
import { useChatNotifications } from '@/context/ChatNotificationContext';
import { useSocket } from '@/context/SocketContext';
import { JoinProjectModal } from '@/components/project/JoinProjectModal';
import { CreateProjectModal } from '@/components/project/CreateProjectModal';
import { NewMessageModal } from '@/components/chat/NewMessageModal';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'All Projects', href: '/projects', icon: FolderKanban },
];

const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-sky-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-rose-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-orange-500',
];

function getAvatarColor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);

  const { projects } = useProjects();
  const { teammates } = useTeammates();
  const { user, isLoaded } = useUser();
  const { userId: currentUserId } = useAuth();
  const { signOut } = useClerk();
  const { totalUnreadCount, unreadCounts } = useChatNotifications();
  const { onlineUsers } = useSocket();

  const userDisplayName =
    user?.fullName || user?.firstName || user?.emailAddresses?.[0]?.emailAddress || 'User';

  // Show up to 6 DMs inline; the rest accessible via "More People" → modal
  const INLINE_LIMIT = 6;
  const inlineTeammates = teammates.slice(0, INLINE_LIMIT);
  const hiddenCount = Math.max(0, teammates.length - INLINE_LIMIT);

  return (
    <>
      <aside className="w-64 bg-[#16191e]/90 dark:bg-[#10141d]/75 backdrop-blur-2xl rounded-3xl p-4 text-white flex flex-col justify-between h-[calc(100vh-2rem)] sticky top-4 z-30 shadow-2xl border border-zinc-800/60 dark:border-white/[0.08] select-none transition-colors">
        {/* User Profile & Synca Header */}
        <div className="pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-3 px-1 py-1">
            {isLoaded && user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={userDisplayName}
                className="w-9 h-9 rounded-full object-cover border border-lime-500/40 shadow-sm"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-lime-400 to-emerald-500 flex items-center justify-center text-zinc-950 font-bold text-sm shadow-sm">
                {userDisplayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold truncate text-white">{userDisplayName}</span>
              </div>
              <p className="text-[11px] text-lime-400/90 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 inline" />
                <span>Synca Workspace</span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-lime-500/10 hover:bg-lime-500/20 border border-lime-500/20 text-lime-400 text-xs font-semibold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create</span>
            </button>
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-300 text-xs font-semibold transition-all"
            >
              <KeyRound className="w-3.5 h-3.5 text-lime-400" />
              <span>Join</span>
            </button>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1 scrollbar-thin scrollbar-thumb-zinc-800 mt-3">
          <nav className="space-y-1.5">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              const Icon = item.icon;

              if (item.href === '/projects') {
                return (
                  <div key={item.name} className="space-y-1">
                    <div
                      className={cn(
                        'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer',
                        isActive
                          ? 'bg-[#1e232b] text-white border-l-4 border-[#d8f870]'
                          : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                      )}
                      onClick={() => setProjectsExpanded(!projectsExpanded)}
                    >
                      <Link href={item.href} className="flex items-center gap-3 flex-1">
                        <Icon className="w-4 h-4 text-zinc-400" />
                        <span>{item.name}</span>
                      </Link>
                      <ChevronRight
                        className={cn(
                          'w-4 h-4 text-zinc-400 transition-transform duration-200',
                          projectsExpanded && 'rotate-90'
                        )}
                      />
                    </div>

                    {/* Sub-projects list */}
                    {projectsExpanded && (
                      <div className="pl-8 pr-2 py-1 space-y-1 text-xs text-zinc-400 border-l border-zinc-800/60 ml-5">
                        {projects.length > 0 ? (
                          projects.slice(0, 8).map((proj) => {
                            const isProjActive = pathname === `/projects/${proj._id}`;
                            const projUnread = unreadCounts[`channel_${String(proj._id)}`] || 0;
                            return (
                              <div key={String(proj._id)} className="flex items-center justify-between gap-1 group/item">
                                <Link
                                  href={`/projects/${proj._id}`}
                                  className={cn(
                                    'py-1 truncate transition-colors flex items-center gap-1.5 hover:text-[#d8f870] flex-1 min-w-0',
                                    isProjActive ? 'text-[#d8f870] font-semibold' : 'text-zinc-400'
                                  )}
                                >
                                  <span className={cn('text-xs', isProjActive ? 'text-[#d8f870]' : 'text-zinc-600')}>›</span>
                                  <span className="truncate">{proj.name}</span>
                                </Link>
                                <Link
                                  href={`/projects/${proj._id}?tab=conversation`}
                                  title={`Open #${proj.name} conversation`}
                                  className="p-1 rounded-md text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 transition-colors flex items-center gap-1"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  {projUnread > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-bold text-[9px] shadow-sm">
                                      {projUnread}
                                    </span>
                                  )}
                                </Link>
                              </div>
                            );
                          })
                        ) : (
                          <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="hover:text-[#d8f870] cursor-pointer py-1 truncate transition-colors flex items-center gap-1.5 text-zinc-500 italic"
                          >
                            <span>+ Create a project</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative',
                    isActive
                      ? 'bg-[#1e232b] text-white border-l-4 border-[#d8f870]'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isActive ? 'text-[#d8f870]' : 'text-zinc-400')} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="h-px bg-zinc-800/80" />

          {/* ─── Direct Messages Section ─── */}
          <div className="space-y-2">
            {/* Section Header with + button */}
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Direct Messages
              </span>
              <button
                onClick={() => setIsNewMessageOpen(true)}
                title="New direct message"
                className="w-5 h-5 rounded-md flex items-center justify-center text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Inline DM list */}
            <div className="space-y-0.5">
              {inlineTeammates.length > 0 ? (
                inlineTeammates.map((member) => {
                  const isOnline = Boolean(onlineUsers[member.userId]);
                  const dmUnread = unreadCounts[`dm_${member.userId}`] || 0;
                  const color = getAvatarColor(member.userId);
                  const isDmActive =
                    pathname === '/chats' &&
                    typeof window !== 'undefined' &&
                    new URLSearchParams(window.location.search).get('dm') === member.userId;

                  return (
                    <Link
                      key={member.userId}
                      href={`/chats?dm=${member.userId}&name=${encodeURIComponent(member.name)}`}
                      className={cn(
                        'flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-colors group cursor-pointer',
                        isDmActive
                          ? 'bg-zinc-800/80 text-white'
                          : 'hover:bg-zinc-800/40'
                      )}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs', color)}>
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span
                          className={cn(
                            'absolute bottom-0 right-0 w-2 h-2 rounded-full border border-[#16191e]',
                            isOnline ? 'bg-emerald-400' : 'bg-zinc-600'
                          )}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-300 group-hover:text-white truncate">
                          {member.name}
                        </p>
                      </div>

                      {/* Unread badge */}
                      {dmUnread > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-bold text-[9px] shadow-sm flex-shrink-0">
                          {dmUnread}
                        </span>
                      )}
                    </Link>
                  );
                })
              ) : (
                /* Empty state — invite to start */
                <button
                  onClick={() => setIsNewMessageOpen(true)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800/30 transition-colors text-xs italic"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start a conversation</span>
                </button>
              )}
            </div>

            {/* More People button (opens modal with full list) */}
            {(hiddenCount > 0 || teammates.length === 0) && (
              <button
                onClick={() => setIsNewMessageOpen(true)}
                className="w-full mt-1 py-1.5 px-3 rounded-full bg-zinc-800/60 hover:bg-zinc-800 text-[11px] font-medium text-zinc-300 flex items-center justify-center gap-2 transition-colors border border-zinc-700/50"
              >
                <span>More People</span>
                {hiddenCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#d8f870] text-zinc-900 font-bold text-[10px]">
                    {hiddenCount}+
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="pt-4 mt-2 border-t border-zinc-800/80 space-y-1">
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all',
              pathname === '/settings'
                ? 'bg-[#1e232b] text-white border-l-4 border-[#d8f870]'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
            )}
          >
            <Settings className="w-4 h-4 text-zinc-400" />
            <span>Settings</span>
          </Link>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Modals */}
      <JoinProjectModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
      <NewMessageModal
        isOpen={isNewMessageOpen}
        onClose={() => setIsNewMessageOpen(false)}
      />
    </>
  );
}

