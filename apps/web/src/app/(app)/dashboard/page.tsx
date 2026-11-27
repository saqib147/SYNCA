'use client';

import {
  CheckCircle2,
  FolderKanban,
  Gauge,
  ArrowUpRight,
  Plus,
  MessageSquare,
} from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useUser, useAuth } from '@clerk/nextjs';
import { TaskCard } from '@/components/shared/TaskCard';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { TaskDetailModal } from '@/components/task/TaskDetailModal';
import { TaskModal } from '@/components/task/TaskModal';
import { CreateProjectModal } from '@/components/project/CreateProjectModal';
import { useProjects } from '@/hooks/useProjects';
import { useTeammates } from '@/hooks/useTeammates';
import { useChatNotifications } from '@/context/ChatNotificationContext';
import { fetchMyTasks, createTaskApi } from '@/lib/api/task.api';
import { Task } from '@synca/types';
import { cn } from '@/lib/utils';

const PROJECT_ICON_ACCENTS = [
  'bg-[#e6f7f1] text-[#006c52] dark:bg-[#66deb4]/15 dark:text-[#66deb4]',
  'bg-[#F0FF7C] text-[#191c1d] dark:bg-[#F0FF7C]/15 dark:text-[#F0FF7C]',
  'bg-[#eef6ff] text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  'bg-[#e7e8e9] text-[#191c1d] dark:bg-white/[0.08] dark:text-zinc-200',
  'bg-[#ffdad6] text-[#93000a] dark:bg-rose-500/15 dark:text-rose-300',
];

// Module-level cache for Dashboard tasks to prevent empty-state flashes on revisit
let myTasksCache: Task[] | null = null;
let myTasksCacheUserId: string | null = null;
let myTasksCacheAt = 0;
let inFlightMyTasksPromise: Promise<Task[]> | null = null;
const MY_TASKS_TTL = 30 * 1000;

export default function DashboardPage() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { getToken, isSignedIn, isLoaded: isAuthLoaded, userId } = useAuth();
  const { projects } = useProjects();
  const { teammates } = useTeammates();
  const { unreadCounts } = useChatNotifications();

  const [activeTab, setActiveTab] = useState<'Upcoming' | 'Overdue' | 'Completed'>('Upcoming');
  const [greeting, setGreeting] = useState('Good Evening');
  const [liveTasks, setLiveTasks] = useState<Task[]>(() =>
    myTasksCache && myTasksCacheUserId === userId ? myTasksCache : []
  );
  const [isTasksLoading, setIsTasksLoading] = useState<boolean>(
    () => !(myTasksCache && myTasksCacheUserId === userId)
  );
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPrivateTaskModalOpen, setIsPrivateTaskModalOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  const loadTasks = useCallback(
    async (force = false) => {
      if (!isSignedIn || !userId) return;
      if (
        !force &&
        myTasksCache &&
        myTasksCacheUserId === userId &&
        Date.now() - myTasksCacheAt < MY_TASKS_TTL
      ) {
        setLiveTasks(myTasksCache);
        setIsTasksLoading(false);
        return;
      }

      try {
        if (!myTasksCache || myTasksCacheUserId !== userId) {
          setIsTasksLoading(true);
        }
        if (!inFlightMyTasksPromise || force) {
          inFlightMyTasksPromise = (async () => {
            let token = await getToken();
            if (!token) token = await getToken({ skipCache: true });
            if (!token) return myTasksCache || [];
            const fetched = await fetchMyTasks(token);
            myTasksCache = fetched;
            myTasksCacheUserId = userId;
            myTasksCacheAt = Date.now();
            return fetched;
          })().finally(() => {
            inFlightMyTasksPromise = null;
          });
        }
        const fetched = await inFlightMyTasksPromise;
        setLiveTasks(fetched);
      } catch (err) {
        console.warn('[DashboardPage] Could not load live tasks:', err);
      } finally {
        setIsTasksLoading(false);
      }
    },
    [getToken, isSignedIn, userId]
  );

  useEffect(() => {
    if (isAuthLoaded && isSignedIn) {
      loadTasks(false);
    }
    const handleSync = () => loadTasks(true);
    window.addEventListener('synca:projects-changed', handleSync);
    window.addEventListener('synca:tasks-changed', handleSync);
    return () => {
      window.removeEventListener('synca:projects-changed', handleSync);
      window.removeEventListener('synca:tasks-changed', handleSync);
    };
  }, [isAuthLoaded, isSignedIn, loadTasks]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  const firstName = useMemo(() => {
    if (!isUserLoaded) return '...';
    const raw =
      user?.firstName ||
      user?.username ||
      user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] ||
      'User';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [isUserLoaded, user]);

  // Filter out tasks belonging to deleted/unjoined projects
  const validTasks = useMemo(() => {
    if (projects.length === 0) return liveTasks;
    return liveTasks.filter((t) => {
      if (!t.projectId) return true;
      return projects.some((p) => String(p._id) === String(t.projectId));
    });
  }, [liveTasks, projects]);

  const personalPrivateTasks = useMemo(
    () => validTasks.filter((t) => !t.projectId),
    [validTasks]
  );

  const getProjectName = useCallback(
    (projectId?: string | null) => {
      if (!projectId) return 'Personal Task';
      const found = projects.find((p) => String(p._id) === String(projectId));
      return found ? found.name : 'Project';
    },
    [projects]
  );

  // KPI Metrics (Matches Figma 27:594 top-right 3 cards)
  const totalTasks = validTasks.length;
  const completedCount = validTasks.filter((t) => t.status === 'Done').length;
  const completionRate = totalTasks > 0 ? ((completedCount / totalTasks) * 100).toFixed(1) : '0.0';
  const activeProjectsCount = projects.filter((p) => p.status !== 'Archived').length;

  const weeklyCompletedCount = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return validTasks.filter(
      (t) => t.status === 'Done' && new Date(t.updatedAt || t.createdAt).getTime() >= sevenDaysAgo
    ).length;
  }, [validTasks]);

  const teamVelocity = useMemo(() => {
    if (projects.length === 0) return completedCount;
    return Math.round((completedCount / Math.max(projects.length, 1)) * 10) / 10;
  }, [completedCount, projects.length]);

  // Filtered Task Status list
  const filteredTasks = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return validTasks
      .filter((t) => {
        if (activeTab === 'Completed') return t.status === 'Done';
        const isDone = t.status === 'Done';
        if (isDone) return false;
        const dueMs = t.dueDate ? new Date(t.dueDate).getTime() : null;
        if (activeTab === 'Overdue') {
          return dueMs !== null && dueMs < todayStart;
        }
        // Upcoming: non-done tasks with no due date or due today/later
        return dueMs === null || dueMs >= todayStart;
      })
      .map((t, index) => {
        const dueFormatted = t.dueDate
          ? new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
          : 'No date';
        const isOverdue =
          t.status !== 'Done' && t.dueDate && new Date(t.dueDate).getTime() < todayStart;
        const statusLabel =
          t.status === 'Done' ? 'Completed' : isOverdue ? 'Overdue' : 'Upcoming';
        const bgVariant: 'yellow' | 'peach' | 'white' =
          index === 0 ? 'yellow' : index === 1 ? 'peach' : 'white';

        return {
          raw: t,
          id: t._id,
          title: t.title,
          project: getProjectName(t.projectId),
          dueDate: dueFormatted,
          status: statusLabel,
          tag: t.priority || 'Medium',
          bgVariant,
        };
      });
  }, [validTasks, activeTab, getProjectName]);

  // Completed tasks by weekday (Mon–Sun)
  const weekdayStats = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts = new Array<number>(7).fill(0);
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const t of validTasks) {
      if (t.status === 'Done') {
        const ts = new Date(t.updatedAt || t.createdAt).getTime();
        if (ts >= sevenDaysAgo) {
          const jsDay = new Date(ts).getDay(); // 0=Sun..6=Sat
          const idx = jsDay === 0 ? 6 : jsDay - 1;
          counts[idx] += 1;
        }
      }
    }
    return days.map((day, idx) => ({ day, count: counts[idx] }));
  }, [validTasks]);

  return (
    <div className="h-full flex flex-col gap-5 overflow-hidden">
      {/* ─── Top Greeting & 3 KPI Cards Banner (Figma 27:673) ─── */}
      <div className="shrink-0 bg-white dark:bg-[#111316] rounded-[20px] px-7 py-5 border border-[#e5e5e5] dark:border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {/* Two-line Funnel Display Greeting */}
        <div className="font-['Funnel_Display'] font-normal text-[#3e4944] dark:text-zinc-100 leading-[1.05]">
          <h1 className="text-[32px] sm:text-[40px] tracking-tight">{greeting}</h1>
          <p className="text-[32px] sm:text-[40px] tracking-tight">{firstName}</p>
        </div>

        {/* Right: 3 Exact KPI Cards + ThemeToggle */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* KPI 1: Task Completion */}
          <div className="w-[136px] h-[116px] bg-white dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] rounded-[15px] p-3 flex flex-col justify-between">
            <div className="w-9 h-9 rounded-[10px] bg-[#e6f7f1] dark:bg-[#66deb4]/15 flex items-center justify-center text-[#006c52] dark:text-[#66deb4]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-[#3e4944] dark:text-zinc-400 leading-tight">
                Task Completion
              </p>
              <p className="text-[22px] font-bold text-[#191c1d] dark:text-white tracking-[-0.32px] leading-tight mt-0.5">
                {completionRate}%
              </p>
            </div>
          </div>

          {/* KPI 2: Active Projects */}
          <div className="w-[136px] h-[116px] bg-white dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] rounded-[15px] p-3 flex flex-col justify-between">
            <div className="w-9 h-9 rounded-[12px] bg-[#e7e8e9] dark:bg-white/[0.08] flex items-center justify-center text-[#191c1d] dark:text-zinc-200">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-[#3e4944] dark:text-zinc-400 leading-tight">
                Active Projects
              </p>
              <p className="text-[22px] font-bold text-[#191c1d] dark:text-white tracking-[-0.32px] leading-tight mt-0.5">
                {activeProjectsCount}
              </p>
            </div>
          </div>

          {/* KPI 3: Team Velocity */}
          <div className="w-[136px] h-[116px] bg-white dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] rounded-[15px] p-3 flex flex-col justify-between">
            <div className="w-9 h-9 rounded-[12px] bg-[#e7e8e9] dark:bg-white/[0.08] flex items-center justify-center text-[#191c1d] dark:text-zinc-200">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-[#3e4944] dark:text-zinc-400 leading-tight">
                Team Velocity
              </p>
              <p className="text-[22px] font-bold text-[#191c1d] dark:text-white tracking-[-0.32px] leading-tight mt-0.5">
                {teamVelocity}{' '}
                <span className="text-[13px] font-normal text-[#3e4944] dark:text-zinc-400">
                  avg
                </span>
              </p>
            </div>
          </div>

          {/* <div className="ml-1 self-start">
            <ThemeToggle />
          </div> */}
        </div>
      </div>

      {/* ─── Main 3-Column Bento Grid (Matches Figma 27:594) ─── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-3 gap-5 items-stretch overflow-y-auto xl:overflow-hidden pr-1 xl:pr-0">
        {/* Column 1: Tall Task Status Card (Figma 27:679) */}
        <div className="bg-white dark:bg-[#111316] rounded-[20px] p-6 border border-[#e5e5e5] dark:border-white/[0.08] flex flex-col shadow-[0_1px_2px_rgba(0,0,0,0.03)] min-h-[420px] xl:min-h-0 xl:h-full overflow-hidden">
          <div className="shrink-0 flex items-center justify-between gap-3 pb-4 border-b border-[#e5e7eb] dark:border-white/[0.08]">
            <h2 className="text-[18px] font-normal text-[#191c1d] dark:text-zinc-100 font-['Funnel_Display'] shrink-0">
              Task Status
            </h2>

            {/* Segmented Pill Switcher (Upcoming / Overdue / Completed) */}
            <div className="flex items-center bg-[#f3f3f3] dark:bg-white/[0.06] border border-[#e5e7eb] dark:border-white/[0.08] rounded-full p-1 gap-0.5">
              {(['Upcoming', 'Overdue', 'Completed'] as const).map((tab) => {
                const isSelected = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'px-3 py-1 rounded-full text-[12px] font-normal transition-all',
                      isSelected
                        ? 'bg-gradient-to-r from-[#006c52] to-[#66deb4] text-white shadow-[inset_0px_2px_6px_rgba(255,255,255,0.45)]'
                        : 'text-[#3e4944]/75 dark:text-zinc-400 hover:text-[#191c1d] dark:hover:text-white'
                    )}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Task List */}
          <div className="space-y-3.5 pt-5 flex-1 overflow-y-auto pr-1 scrollbar-none">
            {isTasksLoading && liveTasks.length === 0 ? (
              <div className="space-y-3.5">
                {[0, 1, 2].map((idx) => (
                  <div
                    key={idx}
                    className="h-[108px] rounded-[16px] bg-[#f3f4f6] dark:bg-white/[0.04] animate-pulse border border-[#e5e7eb] dark:border-white/[0.06]"
                  />
                ))}
              </div>
            ) : filteredTasks.length > 0 ? (
              filteredTasks.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedTask(item.raw);
                    setIsDetailModalOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  <TaskCard
                    title={item.title}
                    projectName={item.project}
                    dueDate={item.dueDate}
                    status={item.status}
                    tag={item.tag}
                    bgVariant={item.bgVariant}
                  />
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#e6f7f1] dark:bg-[#66deb4]/15 flex items-center justify-center text-[#006c52] dark:text-[#66deb4]">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#191c1d] dark:text-zinc-200">
                    No {activeTab.toLowerCase()} tasks
                  </p>
                  <p className="text-xs text-[#3e4944] dark:text-zinc-400 mt-1 max-w-[220px]">
                    Tasks assigned to you across your projects appear here automatically.
                  </p>
                </div>
                <Link
                  href="/projects"
                  className="px-3.5 py-1.5 rounded-full border border-[#bdc9c2] dark:border-white/[0.15] text-xs text-[#191c1d] dark:text-zinc-200 hover:bg-[#f3f3f3] dark:hover:bg-white/[0.06] transition-colors"
                >
                  Browse Projects
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Completed Tasks + Private Task */}
        <div className="flex flex-col gap-5 xl:h-full xl:min-h-0">
          {/* Completed Tasks Card (Figma 27:674) */}
          <div className="bg-white dark:bg-[#111316] rounded-[20px] p-6 border border-[#e5e5e5] dark:border-white/[0.08] flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex-1 min-h-[260px] xl:min-h-0 overflow-hidden">
            <div className="shrink-0 flex items-start justify-between gap-2">
              <h2 className="text-[18px] font-normal text-[#191c1d] dark:text-zinc-100 font-['Funnel_Display']">
                Completed Tasks
              </h2>
              <p className="text-[12px] font-light text-[#3e4944] dark:text-zinc-400 text-right max-w-[130px] leading-tight">
                {weeklyCompletedCount} Tasks Completed this Week
              </p>
            </div>

            {/* 7 Iconic Vertical Pill Strips (Mon–Sun) */}
            <div className="grid grid-cols-7 gap-2.5 pt-4 items-stretch flex-1 min-h-0">
              {weekdayStats.map(({ day, count }) => {
                const isActiveDay = count > 0;
                return (
                  <div key={day} className="flex flex-col items-center gap-2 min-h-0">
                    <div
                      title={`${day}: ${count} completed task${count !== 1 ? 's' : ''}`}
                      className={cn(
                        'w-full flex-1 min-h-[110px] max-h-[210px] rounded-[66px] transition-transform duration-200 hover:scale-[1.03] flex items-start justify-center pt-3 relative',
                        isActiveDay
                          ? 'bg-gradient-to-b from-[#66deb4] to-[#006c52] shadow-[inset_0px_4px_10px_0px_rgba(255,255,255,0.65)]'
                          : 'bg-gradient-to-b from-[#66deb4]/40 to-[#006c52]/25 dark:from-[#66deb4]/20 dark:to-[#006c52]/20'
                      )}
                    >
                      {count > 0 && (
                        <span className="text-[11px] font-bold text-white drop-shadow-sm">
                          {count}
                        </span>
                      )}
                    </div>
                    <span className="text-[13px] font-light text-[#3e4944] dark:text-zinc-400 shrink-0">
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Private Task Card (Figma 27:678) */}
          <div className="bg-white dark:bg-[#111316] rounded-[20px] p-6 border border-[#e5e5e5] dark:border-white/[0.08] flex flex-col flex-1 min-h-[240px] xl:min-h-0 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="shrink-0 flex items-center justify-between mb-3">
              <h2 className="text-[18px] font-normal text-[#191c1d] dark:text-zinc-100 font-['Funnel_Display']">
                Private Task
              </h2>
              <button
                type="button"
                onClick={() => setIsPrivateTaskModalOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-[#bdc9c2] dark:border-white/[0.15] text-[12px] text-[#191c1d] dark:text-zinc-200 hover:bg-[#f3f3f3] dark:hover:bg-white/[0.06] transition-colors font-['Funnel_Display']"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {personalPrivateTasks.length > 0 ? (
              <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 scrollbar-none">
                {personalPrivateTasks.slice(0, 5).map((pt) => (
                  <button
                    key={pt._id}
                    type="button"
                    onClick={() => {
                      setSelectedTask(pt);
                      setIsDetailModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2.5 rounded-[12px] bg-[#bebebe]/20 dark:bg-white/[0.04] border border-black/10 dark:border-white/[0.08] hover:border-[#66deb4] transition-colors flex items-center justify-between gap-2"
                  >
                    <span
                      className={cn(
                        'text-xs font-medium truncate',
                        pt.status === 'Done'
                          ? 'line-through text-zinc-400'
                          : 'text-black dark:text-zinc-100'
                      )}
                    >
                      {pt.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-white/[0.08] text-zinc-600 dark:text-zinc-300 shrink-0">
                      {pt.status}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsPrivateTaskModalOpen(true)}
                className="flex-1 flex flex-col items-center justify-center text-center gap-2 rounded-2xl hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-[#bebebe]/20 dark:bg-white/[0.06] flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                  <Plus className="w-5 h-5" />
                </div>
                <p className="text-[14px] font-['Funnel_Display'] text-black dark:text-zinc-200">
                  Private Task
                </p>
                <p className="text-xs text-zinc-400">
                  Click to add a personal to-do visible only to you
                </p>
              </button>
            )}
          </div>
        </div>

        {/* Column 3: Ongoing Projects + Recent / Unread Chats */}
        <div className="flex flex-col gap-5 xl:h-full xl:min-h-0">
          {/* Ongoing Projects Card (Figma 27:676) */}
          <div className="bg-white dark:bg-[#111316] rounded-[20px] p-6 border border-[#e5e5e5] dark:border-white/[0.08] flex flex-col shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex-1 min-h-[260px] xl:min-h-0 overflow-hidden">
            <div className="shrink-0 flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-normal text-[#191c1d] dark:text-zinc-100 font-['Funnel_Display']">
                Ongoing Projects
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateProjectOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[#bdc9c2] dark:border-white/[0.15] text-[14px] text-[#191c1d] dark:text-zinc-200 hover:bg-[#f3f3f3] dark:hover:bg-white/[0.06] transition-colors font-['Funnel_Display']"
              >
                <span>New</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3.5 flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-none">
              {projects.length > 0 ? (
                projects.slice(0, 5).map((proj, idx) => (
                  <Link
                    key={proj._id}
                    href={`/projects/${proj._id}`}
                    className="flex items-center gap-3.5 group"
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0',
                        PROJECT_ICON_ACCENTS[idx % PROJECT_ICON_ACCENTS.length]
                      )}
                    >
                      {proj.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[20px] font-normal text-[#191c1d] dark:text-zinc-100 leading-tight truncate font-['Funnel_Display'] group-hover:text-[#006c52] dark:group-hover:text-[#66deb4] transition-colors">
                        {proj.name}
                      </h4>
                      <p className="text-[13px] font-normal text-[#3e4944] dark:text-zinc-400 font-['Funnel_Display'] truncate mt-0.5">
                        {proj.status} · Code {proj.joinCode}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-10 text-center space-y-2">
                  <p className="text-xs font-medium text-[#3e4944] dark:text-zinc-300">
                    No active projects yet
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCreateProjectOpen(true)}
                    className="px-3.5 py-1.5 rounded-full bg-[#006c52] hover:bg-[#005742] text-white text-xs font-semibold transition-colors"
                  >
                    + Create Project
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom-Right: Recent / Unread Chats Card (Figma 27:677 & 76:287) */}
          <div className="bg-white dark:bg-[#111316] rounded-[20px] p-5 border border-[#e5e5e5] dark:border-white/[0.08] flex flex-col flex-1 min-h-[240px] xl:min-h-0 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            {teammates.length > 0 ? (
              <div className="space-y-2.5 flex-1 min-h-0 overflow-y-auto pr-0.5 scrollbar-none">
                {teammates.slice(0, 5).map((peer) => {
                  const dmUnread = unreadCounts[`dm_${peer.userId}`] || 0;
                  return (
                    <Link
                      key={peer.userId}
                      href={`/chats?dm=${peer.userId}&name=${encodeURIComponent(peer.name)}&avatar=${encodeURIComponent(peer.avatarUrl || '')}`}
                      className="h-[57px] px-3 rounded-[10px] bg-[#f8f9fa] dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] hover:border-[#006c52] dark:hover:border-[#66deb4] flex items-center gap-3 transition-colors group"
                    >
                      {/* Avatar + Name */}
                      <div className="flex items-center gap-2.5 min-w-0 w-[42%] shrink-0">
                        {peer.avatarUrl ? (
                          <img
                            src={peer.avatarUrl}
                            alt={peer.name}
                            className="w-9 h-9 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#e6f7f1] dark:bg-[#1e2127] border border-[#a7e9d2] dark:border-white/[0.1] text-[#006c52] dark:text-[#66deb4] text-xs font-bold flex items-center justify-center shrink-0">
                            {peer.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[13px] font-normal text-[#191c1d] dark:text-zinc-100 truncate leading-tight">
                            {peer.name}
                          </p>
                          <p className="text-[10px] text-[#3e4944] dark:text-zinc-400 truncate leading-tight mt-0.5">
                            {peer.sharedProjects?.[0] || 'Direct Message'}
                          </p>
                        </div>
                      </div>

                      {/* Vertical hairline divider (Figma imgLine9) */}
                      <div className="w-px h-6 bg-[#e5e7eb] dark:bg-white/15 shrink-0" />

                      {/* Last message preview */}
                      <p className="text-[10px] text-[#191c1d] dark:text-zinc-300 truncate flex-1">
                        {peer.lastMessagePreview || 'Start a conversation…'}
                      </p>

                      {/* Unread / Open Badge */}
                      {dmUnread > 0 ? (
                        <span className="px-2 py-0.5 rounded-[7px] bg-[#e6f7f1] dark:bg-[#66deb4]/20 text-[#006c52] dark:text-[#66deb4] text-[9px] font-semibold shrink-0">
                          Unread{dmUnread > 1 ? ` (${dmUnread})` : ''}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-[7px] bg-white dark:bg-white/[0.08] text-[#3e4944] dark:text-zinc-400 text-[9px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          Open
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2 py-8">
                <div className="w-10 h-10 rounded-2xl bg-[#e6f7f1] dark:bg-[#66deb4]/15 flex items-center justify-center text-[#006c52] dark:text-[#66deb4]">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-[#191c1d] dark:text-zinc-300">
                  No recent conversations yet
                </p>
                <p className="text-[11px] text-[#3e4944] dark:text-zinc-400 max-w-[220px]">
                  Recent direct messages and unread chats will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Detail Modal */}
      {isDetailModalOpen && (
        <TaskDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          task={selectedTask}
          projectName={
            selectedTask?.projectId
              ? projects.find((p) => String(p._id) === String(selectedTask.projectId))?.name ||
              'Active Project'
              : 'Personal Task'
          }
          userProjectRole={(() => {
            if (!selectedTask?.projectId || !userId) return null;
            const proj = projects.find((p) => String(p._id) === String(selectedTask.projectId));
            if (!proj) return null;
            if (proj.ownerId === userId) return 'Admin';
            return (proj.members?.find((m) => m.userId === userId)?.role as any) || 'Member';
          })()}
          members={[
            ...(userId
              ? [{ userId, name: user?.fullName || firstName, imageUrl: user?.imageUrl }]
              : []),
            ...teammates.map((t) => ({
              userId: t.userId,
              name: t.name,
              imageUrl: t.avatarUrl,
            })),
          ]}
          onTaskUpdated={(updated) => {
            setSelectedTask(updated);
            setLiveTasks((prev) => {
              const next = prev.map((t) => (t._id === updated._id ? updated : t));
              myTasksCache = next;
              myTasksCacheAt = Date.now();
              return next;
            });
          }}
          onTaskDeleted={(deletedId) => {
            setSelectedTask(null);
            setLiveTasks((prev) => {
              const next = prev.filter((t) => t._id !== deletedId);
              myTasksCache = next;
              myTasksCacheAt = Date.now();
              return next;
            });
          }}
        />
      )}

      {/* Personal Private Task Modal */}
      {isPrivateTaskModalOpen && (
        <TaskModal
          isOpen={isPrivateTaskModalOpen}
          onClose={() => setIsPrivateTaskModalOpen(false)}
          projectId={undefined}
          onSave={async (data) => {
            const token = await getToken();
            if (!token) throw new Error('Session expired');
            const created = await createTaskApi({ ...data, projectId: null, isPrivate: true }, token);
            setLiveTasks((prev) => {
              const next = [created, ...prev];
              myTasksCache = next;
              myTasksCacheAt = Date.now();
              return next;
            });
          }}
        />
      )}

      {/* Create Project Modal (triggered by "New ↗" in Ongoing Projects) */}
      {isCreateProjectOpen && (
        <CreateProjectModal
          isOpen={isCreateProjectOpen}
          onClose={() => setIsCreateProjectOpen(false)}
        />
      )}
    </div>
  );
}
