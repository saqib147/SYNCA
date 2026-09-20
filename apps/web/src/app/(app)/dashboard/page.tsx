'use client';

import { CheckCircle2, FolderGit2, Zap, ArrowUpRight, Plus, Loader2 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useUser, useAuth } from '@clerk/nextjs';
import { TaskCard } from '@/components/shared/TaskCard';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useProjects } from '@/hooks/useProjects';
import { fetchMyTasks } from '@/lib/api/task.api';
import { Task } from '@synca/types';



export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { projects } = useProjects();
  const [activeTab, setActiveTab] = useState<'Upcoming' | 'Overdue' | 'Completed'>('Upcoming');
  const [greeting, setGreeting] = useState('Good Evening');
  const [liveTasks, setLiveTasks] = useState<Task[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadTasks() {
      if (!activeWorkspace?._id) return;
      try {
        const token = await getToken();
        if (!token) return;
        const fetched = await fetchMyTasks(activeWorkspace._id, token);
        if (isMounted) {
          setLiveTasks(fetched);
        }
      } catch (err) {
        console.warn('[DashboardPage] Could not load live tasks, using fallbacks:', err);
      }
    }
    loadTasks();

    const handleSync = () => {
      loadTasks();
    };

    window.addEventListener('synca:projects-changed', handleSync);
    window.addEventListener('synca:tasks-changed', handleSync);

    return () => {
      isMounted = false;
      window.removeEventListener('synca:projects-changed', handleSync);
      window.removeEventListener('synca:tasks-changed', handleSync);
    };
  }, [activeWorkspace?._id, getToken]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good Morning');
    } else if (hour < 18) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }
  }, []);

  const getDisplayName = () => {
    if (!isLoaded) return '...';
    let name = '';
    if (user?.firstName) {
      name = user.firstName;
    } else if (user?.username) {
      name = user.username;
    } else if (user?.emailAddresses?.[0]?.emailAddress) {
      name = user.emailAddresses[0].emailAddress.split('@')[0];
    } else {
      name = 'User';
    }
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const userName = getDisplayName();

  // Exclude tasks that belong to projects that are no longer active
  const validTasks = useMemo(() => {
    return liveTasks.filter((t) => {
      if (!t.projectId) return true; // Personal task
      return projects.some((p) => p._id === t.projectId);
    });
  }, [liveTasks, projects]);

  const getProjectName = (projectId?: string | null) => {
    if (!projectId) return 'Personal Task';
    const found = projects.find((p) => p._id === projectId);
    return found?.name || 'Active Project';
  };

  const displayedUpcoming = useMemo(() => {
    return validTasks
      .filter((t) => t.status !== 'Done' && (!t.dueDate || new Date(t.dueDate) >= new Date()))
      .map((t) => ({
        id: t._id,
        title: t.title,
        project: getProjectName(t.projectId),
        dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Flexible',
        status: 'Upcoming',
        tag: t.priority,
        bgVariant: (t.priority === 'High' ? 'peach' : t.priority === 'Medium' ? 'yellow' : 'white') as any,
      }));
  }, [validTasks, projects]);

  const displayedOverdue = useMemo(() => {
    return validTasks
      .filter((t) => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < new Date())
      .map((t) => ({
        id: t._id,
        title: t.title,
        project: getProjectName(t.projectId),
        dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Overdue',
        status: 'Overdue',
        tag: t.priority,
        bgVariant: 'peach' as any,
      }));
  }, [validTasks, projects]);

  const displayedCompleted = useMemo(() => {
    return validTasks
      .filter((t) => t.status === 'Done')
      .map((t) => ({
        id: t._id,
        title: t.title,
        project: getProjectName(t.projectId),
        dueDate: t.updatedAt ? new Date(t.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Done',
        status: 'Completed',
        tag: 'Done',
        bgVariant: 'white' as any,
      }));
  }, [validTasks, projects]);

  const completionPct = useMemo(() => {
    if (validTasks.length === 0) return 0;
    const completed = validTasks.filter((t) => t.status === 'Done').length;
    return Math.round((completed / validTasks.length) * 100);
  }, [validTasks]);

  const activeProjectsCount = projects.length;

  const currentTasks =
    activeTab === 'Upcoming'
      ? displayedUpcoming
      : activeTab === 'Overdue'
        ? displayedOverdue
        : displayedCompleted;

  const weeklyCompletedCount = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return validTasks.filter(
      (t) => t.status === 'Done' && t.updatedAt && new Date(t.updatedAt) >= oneWeekAgo
    ).length;
  }, [validTasks]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl rounded-3xl p-6 border border-zinc-200/80 dark:border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm transition-colors">
        <div>
          <h1 className="text-3xl font-normal text-zinc-900 dark:text-zinc-100 tracking-tight">
            {greeting}, {userName}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Here is what is happening across your projects today.</p>
        </div>

        {/* Stats Chips & Theme Toggle */}
        <div className="flex items-center gap-3">
          {/* Task Completion Gauge */}
          <div className="bg-zinc-50 dark:bg-white/[0.04] dark:backdrop-blur-md border border-zinc-200/80 dark:border-white/[0.08] rounded-2xl p-3 flex items-center gap-3 min-w-[145px] hover:-translate-y-0.5 hover:border-emerald-200 dark:hover:border-emerald-500/40 transition-all duration-300 group">
            <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="14"
                  className="stroke-zinc-200/60 dark:stroke-zinc-700"
                  strokeWidth="3"
                  fill="transparent"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="14"
                  className="stroke-emerald-500 transition-all duration-500 ease-out"
                  strokeWidth="3"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 14}
                  strokeDashoffset={2 * Math.PI * 14 - (completionPct / 100) * (2 * Math.PI * 14)}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400">
                {Math.round(completionPct)}%
              </span>
            </div>
            <div>
              <p className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 group-hover:text-emerald-500/80 transition-colors">Task Completion</p>
              <p className="text-lg font-black text-zinc-900 dark:text-zinc-100 leading-none mt-1">{completionPct}%</p>
            </div>
          </div>

          {/* Active Projects Card */}
          <div className="bg-zinc-50 dark:bg-white/[0.04] dark:backdrop-blur-md border border-zinc-200/80 dark:border-white/[0.08] rounded-2xl p-3 flex items-center gap-3 min-w-[145px] hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-500/40 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-blue-100/70">
              <FolderGit2 className="w-5 h-5 transition-transform group-hover:scale-110" />
            </div>
            <div>
              <p className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 group-hover:text-blue-500/80 transition-colors">Active Projects</p>
              <p className="text-lg font-black text-zinc-900 dark:text-zinc-100 leading-none mt-1">{activeProjectsCount}</p>
            </div>
          </div>

          {/* Team Velocity Card */}
          <div className="bg-zinc-50 dark:bg-white/[0.04] dark:backdrop-blur-md border border-zinc-200/80 dark:border-white/[0.08] rounded-2xl p-3 flex items-center gap-3 min-w-[145px] hover:-translate-y-0.5 hover:border-amber-200 dark:hover:border-amber-500/40 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-amber-100/70">
              <Zap className="w-5 h-5 animate-pulse transition-transform group-hover:scale-110" />
            </div>
            <div>
              <p className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 group-hover:text-amber-500/80 transition-colors">Team Velocity</p>
              <p className="text-lg font-black text-zinc-900 dark:text-zinc-100 leading-none mt-1">
                {weeklyCompletedCount} <span className="text-xs font-semibold text-zinc-400">tasks/wk</span>
              </p>
            </div>
          </div>

          {/* Direct Theme Toggle */}
          <div className="pl-1">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Task Status */}
        <div className="bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl rounded-3xl p-5 border border-zinc-200/80 dark:border-white/[0.08] space-y-4 flex flex-col max-h-[780px] shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-normal text-zinc-900 dark:text-zinc-100">Task Status</h2>
            <div className="flex items-center bg-zinc-100 dark:bg-black/40 border border-transparent dark:border-white/[0.06] p-1 rounded-full text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {(['Upcoming', 'Overdue', 'Completed'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-full transition-all ${activeTab === tab
                    ? 'bg-[#8be6c1] text-zinc-900 font-semibold shadow-sm'
                    : 'hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Render Real Task Cards or Clean Empty State */}
          <div className="space-y-3.5 flex-1 overflow-y-auto pr-1 scrollbar-none">
            {currentTasks.length > 0 ? (
              currentTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  title={task.title}
                  projectName={task.project}
                  dueDate={task.dueDate}
                  status={task.status}
                  tag={task.tag}
                  bgVariant={task.bgVariant}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] flex items-center justify-center text-zinc-400">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500/60" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    No {activeTab.toLowerCase()} tasks
                  </p>
                  <p className="text-xs text-zinc-400 mt-1 max-w-[220px]">
                    Tasks assigned to you in this workspace will automatically appear here.
                  </p>
                </div>
                <Link
                  href="/projects"
                  className="mt-1 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors"
                >
                  Go to Projects
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Middle Column: Charts & Private Tasks */}
        <div className="space-y-6 flex flex-col">
          {/* Completed Tasks Vertical Pill Strips */}
          <div className="bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl rounded-3xl p-6 border border-zinc-200/80 dark:border-white/[0.08] flex flex-col justify-between hover:border-zinc-300/80 dark:hover:border-white/[0.15] transition-all duration-300 min-h-[380px] shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-normal text-zinc-900 dark:text-zinc-100 tracking-tight">Completed Tasks</h2>
              </div>
              <div className="text-right flex flex-col text-[11px] font-medium text-zinc-500 dark:text-zinc-400 leading-tight">
                <span>{weeklyCompletedCount} Tasks Completed this</span>
                <span>Week</span>
              </div>
            </div>

            {/* Vertical Pill Grid */}
            <div className="grid grid-cols-7 gap-3 pt-6 flex-1 items-end">
              {[
                { day: 'Mon', bgClass: 'from-[#5bd9a8] to-[#3cae81]' },
                { day: 'Tue', bgClass: 'from-[#bfead7] to-[#99d7bd]' },
                { day: 'Wed', bgClass: 'from-[#bfead7] to-[#99d7bd]' },
                { day: 'Thu', bgClass: 'from-[#5bd9a8] to-[#3cae81]' },
                { day: 'Fri', bgClass: 'from-[#5bd9a8] to-[#3cae81]' },
                { day: 'Sat', bgClass: 'from-[#bfead7] to-[#99d7bd]' },
                { day: 'Sun', bgClass: 'from-[#5bd9a8] to-[#3cae81]' },
              ].map((dayData) => (
                <div key={dayData.day} className="flex flex-col items-center gap-3">
                  {/* Visual Rounded Pill Strip */}
                  <div
                    className={`w-full h-56 rounded-[36px] bg-gradient-to-b ${dayData.bgClass} transition-all hover:scale-[1.03] cursor-pointer`}
                  />

                  {/* Day Name */}
                  <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">{dayData.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Private Task Placeholder */}
          <div className="bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl rounded-3xl p-6 border border-zinc-200/80 dark:border-white/[0.08] flex flex-col items-center justify-center text-center space-y-2 min-h-[160px] shadow-sm">
            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-white/[0.06] flex items-center justify-center text-zinc-500 dark:text-zinc-400">
              <Plus className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-normal text-zinc-800 dark:text-zinc-200">Private Task</h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Personal to-do items visible only to you</p>
          </div>
        </div>

        {/* Right Column: Ongoing Projects & Team Members */}
        <div className="space-y-6 flex flex-col">
          {/* Ongoing Projects */}
          <div className="bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl rounded-3xl p-6 border border-zinc-200/80 dark:border-white/[0.08] space-y-5 hover:border-zinc-300/80 dark:hover:border-white/[0.15] transition-all duration-300 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-normal text-zinc-900 dark:text-zinc-100 font-funnel">Ongoing Projects</h2>
              <Link
                href="/projects"
                className="text-xs font-normal text-zinc-800 dark:text-zinc-300 border border-zinc-300/90 dark:border-white/[0.12] px-3 py-1 rounded-full hover:bg-zinc-50 dark:hover:bg-white/[0.06] transition-colors flex items-center gap-1"
              >
                New <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-4">
              {projects.length > 0 ? (
                projects.slice(0, 3).map((proj) => (
                  <Link
                    key={proj._id}
                    href={`/projects/${proj._id}`}
                    className="flex items-center gap-4 py-0.5 cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xs">
                      {proj.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-normal text-zinc-900 dark:text-zinc-100 truncate font-funnel group-hover:text-emerald-500 transition-colors">
                        {proj.name}
                      </h4>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 font-normal font-sans">
                        Status: <span className="capitalize">{proj.status}</span>
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-white/[0.04] flex items-center justify-center text-zinc-400">
                    <FolderGit2 className="w-5 h-5 text-blue-500/60" />
                  </div>
                  <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">No active projects yet</p>
                  <p className="text-[11px] text-zinc-400">Launch an initiative in this workspace to track it.</p>
                  <Link
                    href="/projects"
                    className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#d8f870] text-zinc-950 hover:bg-[#c4ea48] transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Project</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Team Members */}
          <div className="bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl rounded-3xl p-5 border border-zinc-200/80 dark:border-white/[0.08] space-y-4 flex-1 hover:border-zinc-300/80 dark:hover:border-white/[0.15] transition-all duration-300 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-normal text-zinc-900 dark:text-zinc-100">Team Members</h2>
              <Link href="/chats" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                Open Chats →
              </Link>
            </div>

            <div className="space-y-2.5 flex-1">
              {activeWorkspace?.members && activeWorkspace.members.length > 0 ? (
                activeWorkspace.members.slice(0, 4).map((member) => {
                  const isCurrentUser = member.userId === user?.id;
                  const name = isCurrentUser
                    ? (user?.fullName || member.name || 'You')
                    : (member.name || member.email || 'Team Member');
                  const avatarUrl = isCurrentUser ? (user?.imageUrl || member.imageUrl) : member.imageUrl;
                  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

                  return (
                    <Link
                      key={member.userId}
                      href="/chats"
                      className="flex items-center gap-3 p-2 rounded-2xl bg-zinc-50/50 dark:bg-white/[0.03] border border-zinc-100/50 dark:border-white/[0.06] hover:bg-zinc-100/60 dark:hover:bg-white/[0.07] transition-all cursor-pointer hover:scale-[1.01] group/chat"
                    >
                      <div className="relative flex-shrink-0">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                            {initials}
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#16191e]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate pr-2">
                            {name}{isCurrentUser ? ' (You)' : ''}
                          </h4>
                          <span className="text-[10px] text-zinc-400 capitalize">
                            {member.role || 'Member'}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                          {member.email || 'Workspace Member'}
                        </p>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="py-6 text-center text-zinc-400 text-xs">
                  No other members in this workspace.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
