'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  ChevronRight,
  Settings,
  LogOut,
  ChevronDown,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useClerk } from '@clerk/nextjs';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';
import { useProjects } from '@/hooks/useProjects';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'All Projects', href: '/projects', icon: FolderKanban },
];

const sampleMembers = [
  { name: 'Saqib Arshad', role: 'Full-Stack Developer', color: 'bg-emerald-500' },
  { name: 'Malaika Tabassum', role: 'Game Developer', color: 'bg-sky-500' },
  { name: 'Ayesha A.', role: 'Web Developer', color: 'bg-amber-500' },
  { name: 'Haris Hashim', role: 'Business Developer', color: 'bg-purple-500' },
  { name: 'M Zain', role: 'Junior Developer', color: 'bg-rose-500' },
  { name: 'Adil Ashraf', role: 'Architect Designer', color: 'bg-indigo-500' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const { projects } = useProjects();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  return (
    <aside className="w-64 bg-[#16191e]/90 dark:bg-[#10141d]/75 backdrop-blur-2xl rounded-3xl p-4 text-white flex flex-col justify-between h-[calc(100vh-2rem)] sticky top-4 z-30 shadow-2xl border border-zinc-800/60 dark:border-white/[0.08] select-none transition-colors">
      {/* Merged User Profile & Workspace Switcher Header */}
      <WorkspaceSwitcher />

      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-1 scrollbar-thin scrollbar-thumb-zinc-800 mt-2">
        {/* Primary Navigation */}
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
                          return (
                            <Link
                              key={proj._id}
                              href={`/projects/${proj._id}`}
                              className={cn(
                                'py-1 truncate transition-colors flex items-center gap-1.5 hover:text-[#d8f870]',
                                isProjActive ? 'text-[#d8f870] font-semibold' : 'text-zinc-400'
                              )}
                            >
                              <span className={cn('text-xs', isProjActive ? 'text-[#d8f870]' : 'text-zinc-600')}>›</span>
                              <span className="truncate">{proj.name}</span>
                            </Link>
                          );
                        })
                      ) : (
                        <Link
                          href="/projects"
                          className="hover:text-[#d8f870] cursor-pointer py-1 truncate transition-colors flex items-center gap-1.5 text-zinc-500 italic"
                        >
                          <span>+ Create a project</span>
                        </Link>
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
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
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

        <div className="h-px bg-zinc-800/80 my-4" />

        {/* Chats Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <span>Chats</span>
          </div>

          <div className="space-y-2">
            {sampleMembers.map((member) => (
              <Link
                key={member.name}
                href={`/chats`}
                className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-zinc-800/40 transition-colors group cursor-pointer"
              >
                <div className="relative">
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-zinc-900 font-bold text-xs', member.color)}>
                    {member.name.charAt(0)}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-[#16191e]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-300 group-hover:text-white truncate">
                    {member.name}
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate">{member.role}</p>
                </div>
              </Link>
            ))}
          </div>

          <button className="w-full mt-2 py-1.5 px-3 rounded-full bg-zinc-800/60 hover:bg-zinc-800 text-[11px] font-medium text-zinc-300 flex items-center justify-center gap-2 transition-colors border border-zinc-700/50">
            <span>More People</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#d8f870] text-zinc-900 font-bold text-[10px]">
              11 +
            </span>
          </button>
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
  );
}
