'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  ChevronRight,
  ChevronLeft,
  Settings,
  LogOut,
  Plus,
  KeyRound,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useClerk } from '@clerk/nextjs';
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

function SidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeDmId = pathname === '/chats' ? searchParams.get('dm') : null;
  const [collapsed, setCollapsed] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);

  const { projects } = useProjects();
  const { teammates } = useTeammates();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { unreadCounts } = useChatNotifications();
  const { onlineUsers } = useSocket();

  const userDisplayName =
    user?.fullName || user?.firstName || user?.emailAddresses?.[0]?.emailAddress || 'User';
  const userSubtitle =
    user?.primaryEmailAddress?.emailAddress || 'Synca Workspace';

  const INLINE_LIMIT = 6;
  const inlineTeammates = teammates.slice(0, INLINE_LIMIT);
  const hiddenCount = Math.max(0, teammates.length - INLINE_LIMIT);

  return (
    <>
      <aside
        className={cn(
          'relative bg-[#17181c] rounded-[20px] py-5 px-4 text-white flex flex-col justify-between h-[calc(100vh-2rem)] sticky top-4 z-30 shadow-xl border border-white/[0.06] select-none transition-all duration-200 shrink-0',
          collapsed ? 'w-[80px] px-3' : 'w-[252px]'
        )}
      >
        {/* Collapse Toggle Handle (Matches Figma right-edge circular chevron) */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-2.5 top-10 w-5 h-5 rounded-full bg-[#17181c] border border-white/20 text-white/80 hover:text-white flex items-center justify-center shadow-md z-40 transition-transform"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        {/* User Profile Header */}
        <div className="pb-4">
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            {isLoaded && user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={userDisplayName}
                className={cn(
                  'rounded-full object-cover border border-white/15 shrink-0',
                  collapsed ? 'w-10 h-10' : 'w-12 h-12'
                )}
              />
            ) : (
              <div
                className={cn(
                  'rounded-full bg-gradient-to-tr from-[#f0ff7c] to-[#66deb4] flex items-center justify-center text-zinc-950 font-bold shrink-0',
                  collapsed ? 'w-10 h-10 text-sm' : 'w-12 h-12 text-base'
                )}
              >
                {userDisplayName.charAt(0).toUpperCase()}
              </div>
            )}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold truncate text-white leading-tight">
                  {userDisplayName}
                </p>
                <p className="text-[11px] text-white/50 truncate mt-0.5">
                  {userSubtitle}
                </p>
              </div>
            )}
          </div>

          {/* Quick Create / Join Actions */}
          {!collapsed && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[8px] bg-[#f0ff7c]/15 hover:bg-[#f0ff7c]/25 border border-[#f0ff7c]/25 text-[#f0ff7c] text-[11px] font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create</span>
              </button>
              <button
                type="button"
                onClick={() => setIsJoinModalOpen(true)}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[8px] bg-[#414141]/30 hover:bg-[#414141]/50 border border-white/[0.08] text-white/80 text-[11px] font-semibold transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#f0ff7c]" />
                <span>Join</span>
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Navigation + Chats */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-0.5 scrollbar-none">
          {/* Primary Nav */}
          <nav className="space-y-2">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              const Icon = item.icon;

              if (item.href === '/projects') {
                return (
                  <div key={item.name} className="space-y-1.5">
                    <div className="relative">
                      {isActive && (
                        <span className="absolute -left-4 top-1/2 -translate-y-1/2 w-[6px] h-9 bg-[#f0ff7c]/75 rounded-r-full" />
                      )}
                      <div
                        className={cn(
                          'flex items-center justify-between px-3 py-2.5 rounded-[6px] text-[13px] transition-colors cursor-pointer font-["Funnel_Display"]',
                          isActive
                            ? 'bg-[#414141]/40 text-white'
                            : 'bg-[#414141]/20 text-white/85 hover:bg-[#414141]/35 hover:text-white',
                          collapsed && 'justify-center px-2'
                        )}
                        onClick={() => !collapsed && setProjectsExpanded(!projectsExpanded)}
                      >
                        <Link
                          href={item.href}
                          className={cn('flex items-center gap-3 flex-1 min-w-0', collapsed && 'justify-center')}
                          title={item.name}
                        >
                          <Icon className="w-4 h-4 text-white/80 shrink-0" />
                          {!collapsed && <span className="truncate">{item.name}</span>}
                        </Link>
                        {!collapsed && (
                          <ChevronRight
                            className={cn(
                              'w-3.5 h-3.5 text-white/50 transition-transform duration-200',
                              projectsExpanded && 'rotate-90'
                            )}
                          />
                        )}
                      </div>
                    </div>

                    {/* Sub-projects list (Matches Figma indented > list) */}
                    {!collapsed && projectsExpanded && (
                      <div className="pl-4 pr-1 py-0.5 space-y-1">
                        {projects.length > 0 ? (
                          projects.slice(0, 6).map((proj) => {
                            const isProjActive = pathname === `/projects/${proj._id}`;
                            const projUnread = unreadCounts[`channel_${String(proj._id)}`] || 0;
                            return (
                              <div key={String(proj._id)} className="flex items-center justify-between gap-1 group/item">
                                <Link
                                  href={`/projects/${proj._id}`}
                                  className={cn(
                                    'py-0.5 truncate transition-colors flex items-center gap-1.5 text-[11px] font-["Funnel_Display"] flex-1 min-w-0',
                                    isProjActive
                                      ? 'text-[#f0ff7c] font-medium'
                                      : 'text-white/80 hover:text-[#f0ff7c]'
                                  )}
                                >
                                  <span className="text-white/50 text-[10px]">›</span>
                                  <span className="truncate">{proj.name}</span>
                                </Link>
                                <Link
                                  href={`/projects/${proj._id}?tab=conversation`}
                                  title={`Open #${proj.name} conversation`}
                                  className="p-1 rounded-md text-white/40 hover:text-[#66deb4] hover:bg-white/[0.06] transition-colors flex items-center gap-1 shrink-0"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  {projUnread > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-[#66deb4] text-zinc-950 font-bold text-[9px]">
                                      {projUnread}
                                    </span>
                                  )}
                                </Link>
                              </div>
                            );
                          })
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(true)}
                            className="text-[11px] text-white/45 hover:text-[#f0ff7c] py-1 italic"
                          >
                            + Create a project
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={item.name} className="relative">
                  {isActive && (
                    <span className="absolute -left-4 top-1/2 -translate-y-1/2 w-[6px] h-9 bg-[#f0ff7c]/75 rounded-r-full" />
                  )}
                  <Link
                    href={item.href}
                    title={item.name}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-[13px] transition-colors font-["Funnel_Display"]',
                      isActive
                        ? 'bg-[#414141]/40 text-white'
                        : 'bg-[#414141]/20 text-white/85 hover:bg-[#414141]/35 hover:text-white',
                      collapsed && 'justify-center px-2'
                    )}
                  >
                    <Icon className="w-4 h-4 text-white/80 shrink-0" />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                </div>
              );
            })}
          </nav>

          <div className="h-px bg-white/15 mx-2" />

          {/* Chats / Direct Messages Section (Matches Figma "Chats" block) */}
          <div className="space-y-2.5">
            {!collapsed ? (
              <div className="flex items-center justify-between px-1">
                <span className="text-[15px] font-normal text-white">Chats</span>
                <button
                  type="button"
                  onClick={() => setIsNewMessageOpen(true)}
                  title="New direct message"
                  className="w-6 h-6 rounded-md flex items-center justify-center text-white/60 hover:text-[#66deb4] hover:bg-white/[0.08] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsNewMessageOpen(true)}
                  title="New direct message"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-[#66deb4] hover:bg-white/[0.08] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="space-y-1">
              {inlineTeammates.length > 0 ? (
                inlineTeammates.map((member) => {
                  const isOnline = Boolean(onlineUsers[member.userId]);
                  const dmUnread = unreadCounts[`dm_${member.userId}`] || 0;
                  const color = getAvatarColor(member.userId);
                  const isDmActive = activeDmId === member.userId;

                  return (
                    <Link
                      key={member.userId}
                      href={`/chats?dm=${member.userId}&name=${encodeURIComponent(member.name)}&avatar=${encodeURIComponent(member.avatarUrl || '')}`}
                      title={member.name}
                      className={cn(
                        'flex items-center gap-2.5 px-1.5 py-1.5 rounded-xl transition-colors group',
                        isDmActive ? 'bg-white/[0.1] text-white' : 'hover:bg-white/[0.05]',
                        collapsed && 'justify-center px-0'
                      )}
                    >
                      <div className="relative shrink-0">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs',
                              color
                            )}
                          >
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span
                          className={cn(
                            'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#17181c]',
                            isOnline ? 'bg-[#66deb4]' : 'bg-zinc-600'
                          )}
                        />
                      </div>

                      {!collapsed && (
                        <>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-normal text-white/90 group-hover:text-white truncate leading-tight">
                              {member.name}
                            </p>
                          </div>

                          {dmUnread > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-[#66deb4] text-zinc-950 font-bold text-[9px] shrink-0">
                              {dmUnread}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })
              ) : (
                !collapsed && (
                  <button
                    type="button"
                    onClick={() => setIsNewMessageOpen(true)}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-white/45 hover:text-[#66deb4] hover:bg-white/[0.04] transition-colors text-xs italic"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Start a conversation</span>
                  </button>
                )
              )}
            </div>

            {/* More People Pill (Matches Figma rgba(240,255,124,0.3) rounded-[12.5px] pill) */}
            {!collapsed && (
              <button
                type="button"
                onClick={() => setIsNewMessageOpen(true)}
                className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-[12.5px] bg-[#f0ff7c]/30 hover:bg-[#f0ff7c]/40 text-[11px] font-normal text-white transition-colors"
              >
                <span>More People</span>
                {teammates.length > 0 && (
                  <span className="flex -space-x-1.5 items-center">
                    {teammates.slice(0, 3).map((t) =>
                      t.avatarUrl ? (
                        <img
                          key={t.userId}
                          src={t.avatarUrl}
                          alt={t.name}
                          className="w-4 h-4 rounded-full object-cover ring-1 ring-[#17181c]"
                        />
                      ) : (
                        <span
                          key={t.userId}
                          className={cn(
                            'w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center ring-1 ring-[#17181c]',
                            getAvatarColor(t.userId)
                          )}
                        >
                          {t.name.charAt(0).toUpperCase()}
                        </span>
                      )
                    )}
                    {hiddenCount > 0 && (
                      <span className="pl-2 text-[10px] font-semibold text-[#f0ff7c]">
                        +{hiddenCount}
                      </span>
                    )}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="pt-4 mt-3 border-t border-white/15 space-y-1">
          <Link
            href="/settings"
            title="Settings"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-[6px] text-[13px] font-["Funnel_Display"] transition-colors',
              pathname === '/settings'
                ? 'bg-[#414141]/40 text-white'
                : 'text-white/80 hover:bg-white/[0.05] hover:text-white',
              collapsed && 'justify-center px-2'
            )}
          >
            <Settings className="w-4 h-4 text-white/80 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </Link>
          <button
            type="button"
            onClick={() => signOut()}
            title="Sign out"
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-[6px] text-[13px] font-["Funnel_Display"] text-white/80 hover:text-rose-400 hover:bg-rose-500/10 transition-colors',
              collapsed && 'justify-center px-2'
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign out</span>}
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

export function Sidebar() {
  return (
    <Suspense
      fallback={
        <aside className="w-[252px] bg-[#17181c] rounded-[20px] p-4 h-[calc(100vh-2rem)] sticky top-4 shrink-0" />
      }
    >
      <SidebarContent />
    </Suspense>
  );
}
