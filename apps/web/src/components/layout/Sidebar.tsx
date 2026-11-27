'use client';

import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  ChevronRight,
  ChevronLeft,
  Settings,
  LogOut,
  Plus,
  KeyRound,
  MessageSquare,
  Trash2,
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

function FigmaDashboardIcon({ className }: { className?: string }) {
  return (
    <svg
      width={22}
      height={22}
      style={{ width: 22, height: 22, flexShrink: 0 }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Top-left short, Bottom-left tall */}
      <rect x="3" y="3" width="7.5" height="6" rx="1" />
      <rect x="3" y="11.5" width="7.5" height="9.5" rx="1" />
      {/* Top-right tall, Bottom-right short */}
      <rect x="13.5" y="3" width="7.5" height="9.5" rx="1" />
      <rect x="13.5" y="15" width="7.5" height="6" rx="1" />
    </svg>
  );
}

function FigmaProjectsIcon({ className }: { className?: string }) {
  return (
    <svg
      width={22}
      height={22}
      style={{ width: 22, height: 22, flexShrink: 0 }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14.5 2.5H6.5A2 2 0 0 0 4.5 4.5v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7.5L14.5 2.5Z" />
      <polyline points="14.5 2.5 14.5 7.5 19.5 7.5" />
      <line x1="8.5" y1="11.5" x2="15.5" y2="11.5" />
      <line x1="8.5" y1="14.8" x2="15.5" y2="14.8" />
      <line x1="8.5" y1="18" x2="13" y2="18" />
    </svg>
  );
}

const mainNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: FigmaDashboardIcon },
  { name: 'All Projects', href: '/projects', icon: FigmaProjectsIcon },
];

const FIGMA_NAV_BUTTON_STYLE = (isActive: boolean): React.CSSProperties => ({
  height: 46,
  border: '1px solid transparent',
  background: isActive
    ? 'linear-gradient(95deg, #27282c 0%, #303136 56%, #494a4f 100%) padding-box, linear-gradient(135deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.10) 48%, rgba(255,255,255,0.34) 100%) border-box'
    : 'linear-gradient(95deg, #232428 0%, #2b2c30 56%, #424348 100%) padding-box, linear-gradient(135deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.08) 48%, rgba(255,255,255,0.28) 100%) border-box',
});

const AVATAR_COLORS = [
  'bg-[#006c52]',
  'bg-[#0f5a4a]',
  'bg-[#266d62]',
  'bg-[#335c67]',
  'bg-[#3e4944]',
  'bg-[#1e5245]',
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
  const router = useRouter();
  const activeDmId = pathname === '/chats' ? searchParams.get('dm') : null;
  const [collapsed, setCollapsed] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);

  const { projects } = useProjects();
  const { teammates, deleteConversation } = useTeammates();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { unreadCounts } = useChatNotifications();
  const { onlineUsers } = useSocket();

  const userDisplayName =
    user?.fullName || user?.firstName || user?.emailAddresses?.[0]?.emailAddress || 'User';
  const userSubtitle =
    user?.primaryEmailAddress?.emailAddress || 'Synca Workspace';

  return (
    <>
      <aside
        className={cn(
          'relative bg-[#17181c] dark:bg-[#111316] rounded-[20px] py-5 px-4 text-white flex flex-col justify-between h-full z-30 shadow-xl border border-white/[0.06] dark:border-white/[0.08] select-none transition-all duration-200 shrink-0',
          collapsed ? 'w-[80px] px-3' : 'w-[252px]'
        )}
      >
        {/* Collapse Toggle Handle (Matches Figma right-edge circular chevron) */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-2.5 top-10 w-5 h-5 rounded-full bg-[#17181c] dark:bg-[#111316] border border-white/20 text-white/80 hover:text-[#66deb4] hover:border-[#66deb4]/50 flex items-center justify-center shadow-md z-40 transition-colors"
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
                  'rounded-full bg-gradient-to-tr from-[#006c52] to-[#66deb4] flex items-center justify-center text-white font-bold shrink-0',
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
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[8px] bg-[#66deb4]/15 hover:bg-[#66deb4]/25 border border-[#66deb4]/30 text-[#66deb4] text-[11px] font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create</span>
              </button>
              <button
                type="button"
                onClick={() => setIsJoinModalOpen(true)}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[8px] bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.08] text-white/85 text-[11px] font-semibold transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#66deb4]" />
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
                        <span className="absolute -left-4 top-1/2 -translate-y-1/2 w-[5px] h-8 bg-[#66deb4] rounded-r-full" />
                      )}
                      <Link
                        href={item.href}
                        title={item.name}
                        style={FIGMA_NAV_BUTTON_STYLE(isActive)}
                        className={cn(
                          'w-full flex items-center gap-4 px-3.5 h-[48px] rounded-[8px] text-[15px] font-normal tracking-[0.01em] text-white/95 hover:text-white hover:brightness-110 transition-all font-["Funnel_Display"]',
                          collapsed && 'justify-center px-2'
                        )}
                      >
                        <Icon className="w-[22px] h-[22px] text-white shrink-0" />
                        {!collapsed && <span className="truncate">{item.name}</span>}
                      </Link>
                    </div>

                    {/* Sub-projects list (Always visible directly under All Projects button) */}
                    {!collapsed && (
                      <div className="pl-3 pr-1 py-0.5 space-y-0.5">
                        {projects.length > 0 ? (
                          projects.slice(0, 6).map((proj) => {
                            const isProjActive = pathname === `/projects/${proj._id}`;
                            const projUnread = unreadCounts[`channel_${String(proj._id)}`] || 0;
                            return (
                              <div key={String(proj._id)} className="flex items-center justify-between gap-1 group/item">
                                <Link
                                  href={`/projects/${proj._id}`}
                                  className={cn(
                                    'py-1.5 px-2 rounded-[6px] truncate transition-colors flex items-center gap-1.5 text-[12px] font-["Funnel_Display"] flex-1 min-w-0 hover:bg-white/[0.06]',
                                    isProjActive
                                      ? 'text-[#66deb4] font-medium bg-[#66deb4]/10'
                                      : 'text-white/75 hover:text-[#66deb4]'
                                  )}
                                >
                                  <span className="text-white/45 text-[11px]">›</span>
                                  <span className="truncate">{proj.name}</span>
                                </Link>
                                <Link
                                  href={`/projects/${proj._id}?tab=conversation`}
                                  title={`Open #${proj.name} conversation`}
                                  className="p-1.5 rounded-md text-white/40 hover:text-[#66deb4] hover:bg-white/[0.06] transition-colors flex items-center gap-1 shrink-0"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  {projUnread > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-[#66deb4] text-[#111316] font-bold text-[9px]">
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
                            className="text-[11px] text-white/45 hover:text-[#66deb4] py-1 px-2 italic cursor-pointer"
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
                    <span className="absolute -left-4 top-1/2 -translate-y-1/2 w-[5px] h-8 bg-[#66deb4] rounded-r-full" />
                  )}
                  <Link
                    href={item.href}
                    title={item.name}
                    style={FIGMA_NAV_BUTTON_STYLE(isActive)}
                    className={cn(
                      'w-full flex items-center gap-4 px-3.5 h-[48px] rounded-[8px] text-[15px] font-normal tracking-[0.01em] text-white/95 hover:text-white hover:brightness-110 transition-all font-["Funnel_Display"]',
                      collapsed && 'justify-center px-2'
                    )}
                  >
                    <Icon className="w-[22px] h-[22px] text-white shrink-0" />
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
              {teammates.length > 0 ? (
                teammates.map((member) => {
                  const isOnline = Boolean(onlineUsers[member.userId]);
                  const dmUnread = unreadCounts[`dm_${member.userId}`] || 0;
                  const color = getAvatarColor(member.userId);
                  const isDmActive = activeDmId === member.userId;

                  return (
                    <div
                      key={member.userId}
                      className={cn(
                        'flex items-center gap-1 rounded-xl transition-colors group',
                        isDmActive ? 'bg-[#66deb4]/12 text-white ring-1 ring-[#66deb4]/25' : 'hover:bg-white/[0.05]',
                        collapsed && 'justify-center'
                      )}
                    >
                      <Link
                        href={`/chats?dm=${member.userId}&name=${encodeURIComponent(member.name)}&avatar=${encodeURIComponent(member.avatarUrl || '')}`}
                        title={member.name}
                        className={cn(
                          'flex items-center gap-2.5 px-1.5 py-1.5 flex-1 min-w-0',
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
                              'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#17181c] dark:border-[#111316]',
                              isOnline ? 'bg-[#66deb4]' : 'bg-zinc-600'
                            )}
                          />
                        </div>

                        {!collapsed && (
                          <>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium text-white/90 group-hover:text-white truncate leading-tight">
                                {member.name}
                              </p>
                              {member.lastMessagePreview && (
                                <p className="text-[11px] text-white/45 truncate mt-0.5 leading-tight">
                                  {member.lastMessagePreview}
                                </p>
                              )}
                            </div>

                            {dmUnread > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full bg-[#66deb4] text-[#111316] font-bold text-[9px] shrink-0">
                                {dmUnread}
                              </span>
                            )}
                          </>
                        )}
                      </Link>

                      {!collapsed && (
                        <button
                          type="button"
                          title={`Delete conversation with ${member.name}`}
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (
                              !window.confirm(
                                `Delete conversation with ${member.name}? All messages in this DM will be removed.`
                              )
                            ) {
                              return;
                            }
                            try {
                              await deleteConversation(member.userId);
                              if (activeDmId === member.userId) {
                                router.push('/chats');
                              }
                            } catch (err) {
                              console.error('[Sidebar] Failed to delete DM:', err);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 rounded-md text-white/40 hover:text-rose-400 hover:bg-white/[0.08] transition-all shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                !collapsed && (
                  <button
                    type="button"
                    onClick={() => setIsNewMessageOpen(true)}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-white/45 hover:text-[#66deb4] hover:bg-white/[0.04] transition-colors text-xs italic cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Start a conversation</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="pt-4 mt-3 border-t border-white/10 space-y-1">
          <Link
            href="/settings"
            title="Settings"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-[8px] text-[13px] font-["Funnel_Display"] transition-colors',
              pathname === '/settings'
                ? 'bg-[#66deb4]/15 text-[#66deb4] font-medium'
                : 'text-white/80 hover:bg-white/[0.05] hover:text-white',
              collapsed && 'justify-center px-2'
            )}
          >
            <Settings
              className={cn(
                'w-4 h-4 shrink-0',
                pathname === '/settings' ? 'text-[#66deb4]' : 'text-white/80'
              )}
            />
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

      {/* Modals — conditionally mounted so closed modals never fire background hooks */}
      {isJoinModalOpen && (
        <JoinProjectModal
          isOpen={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
        />
      )}
      {isCreateModalOpen && (
        <CreateProjectModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
      {isNewMessageOpen && (
        <NewMessageModal
          isOpen={isNewMessageOpen}
          onClose={() => setIsNewMessageOpen(false)}
        />
      )}
    </>
  );
}

export function Sidebar() {
  return (
    <Suspense
      fallback={
        <aside className="w-[252px] bg-[#17181c] dark:bg-[#111316] rounded-[20px] p-4 h-full shrink-0" />
      }
    >
      <SidebarContent />
    </Suspense>
  );
}
