'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useUser } from '@clerk/nextjs';
import {
  FolderKanban,
  ChevronLeft,
  Calendar,
  Users,
  UserPlus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Settings2,
  Kanban,
  List,
  FileText,
  Trash2,
  Lock,
  Globe,
  Loader2,
  Sparkles,
  Check,
  KeyRound,
  Copy,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { useTasks, notifyTasksChanged } from '@/hooks/useTasks';
import { notifyProjectsChanged } from '@/hooks/useProjects';
import {
  fetchProjectById,
  updateProjectApi,
  deleteProjectApi,
  regenerateJoinCodeApi,
  EnrichedProject,
} from '@/lib/api/project.api';
import { ProjectKanbanBoard } from '@/components/project/ProjectKanbanBoard';
import { ProjectTaskTable } from '@/components/project/ProjectTaskTable';
import { ProjectConversationTab } from '@/components/project/ProjectConversationTab';
import { useChatNotifications } from '@/context/ChatNotificationContext';
import { TaskModal } from '@/components/task/TaskModal';
import { TaskDetailModal } from '@/components/task/TaskDetailModal';
import { EditTeamModal } from '@/components/project/EditTeamModal';
import { Task, ProjectStatus, ProjectPrivacy } from '@synca/types';
import { cn } from '@/lib/utils';

export default function ProjectDetailPage({
  params: routeParams,
}: {
  params?: { id?: string };
}) {
  const params = useParams();
  const id = ((params?.id as string) || routeParams?.id || '') as string;
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const { unreadCounts } = useChatNotifications();

  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [project, setProject] = useState<EnrichedProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'board' | 'list' | 'settings' | 'conversation'>(() => {
    if (tabParam && ['overview', 'board', 'list', 'settings', 'conversation'].includes(tabParam)) {
      return tabParam as any;
    }
    return 'board';
  });

  const channelUnread = unreadCounts[`channel_${String(project?._id || '')}`] || 0;

  useEffect(() => {
    if (tabParam && ['overview', 'board', 'list', 'settings', 'conversation'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isResettingCode, setIsResettingCode] = useState(false);

  // Role calculation
  const currentUserRole = project?.currentUserRole || 'Member';
  const isAdmin = currentUserRole === 'Admin';
  const isModerator = currentUserRole === 'Moderator';
  const canManageSettings = isAdmin || isModerator;

  // Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultTaskStatus, setDefaultTaskStatus] = useState('To Do');

  // Task Detail Modal state
  const [selectedDetailTask, setSelectedDetailTask] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleOpenTaskDetail = (task: Task) => {
    setSelectedDetailTask(task);
    setIsDetailModalOpen(true);
  };

  // Edit Team Modal state
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);

  // Project Settings form state
  const [settingsName, setSettingsName] = useState('');
  const [settingsDesc, setSettingsDesc] = useState('');
  const [settingsStatus, setSettingsStatus] = useState<ProjectStatus>('ActiveSprint');
  const [settingsPrivacy, setSettingsPrivacy] = useState<ProjectPrivacy>('Public');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load project
  const loadProject = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      if (!token) return;

      const fetched = await fetchProjectById(id, token);
      if (fetched) {
        setProject(fetched);
        setSettingsName(fetched.name);
        setSettingsDesc(fetched.description || '');
        setSettingsStatus(fetched.status);
        setSettingsPrivacy(fetched.privacy);
      }
    } catch (err) {
      console.error('[ProjectDetailPage] Failed to load project:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, [id, getToken]);

  // Tasks hook for this project
  const {
    tasks,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
    refreshTasks,
  } = useTasks(project?._id);

  // Overall Task Completion Progress
  const progressMetrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'Done').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pct };
  }, [tasks]);

  const handleCopyJoinCode = () => {
    if (!project?.joinCode) return;
    navigator.clipboard.writeText(project.joinCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleResetJoinCode = async () => {
    if (!project || !isAdmin) return;
    try {
      setIsResettingCode(true);
      const token = await getToken();
      if (!token) return;
      const res = await regenerateJoinCodeApi(project._id, token);
      setProject({ ...project, joinCode: res.joinCode });
    } catch (err) {
      console.error('Failed to reset join code:', err);
    } finally {
      setIsResettingCode(false);
    }
  };

  const handleOpenAddTask = (status = 'To Do') => {
    setEditingTask(null);
    setDefaultTaskStatus(status);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (data: any) => {
    if (editingTask) {
      await updateTask(editingTask._id, data);
    } else {
      await createTask(data);
    }
  };

  // Toggle Goal completion
  const handleToggleGoal = async (goalIndex: number) => {
    if (!project || !project.goals) return;
    const updatedGoals = project.goals.map((g, idx) =>
      idx === goalIndex ? { ...g, completed: !g.completed } : g
    );

    setProject({ ...project, goals: updatedGoals });

    try {
      const token = await getToken();
      if (!token) return;
      await updateProjectApi(project._id, { goals: updatedGoals as any }, token);
    } catch (err) {
      console.error('Failed to toggle goal:', err);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !canManageSettings) return;

    try {
      setIsSavingSettings(true);
      setSettingsError(null);
      setSettingsSuccess(false);

      const token = await getToken();
      if (!token) return;

      const updated = await updateProjectApi(
        project._id,
        {
          name: settingsName.trim(),
          description: settingsDesc.trim() || undefined,
          status: settingsStatus,
          privacy: settingsPrivacy,
        },
        token
      );

      setProject((prev) => (prev ? { ...prev, ...updated } : null));
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err: any) {
      setSettingsError(err?.message || 'Failed to update project settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Delete Project
  const handleDeleteProject = async () => {
    if (!project || !isAdmin) return;
    const confirm = window.confirm(
      `Are you sure you want to delete "${project.name}"? This project and all its tasks will be deleted.`
    );
    if (!confirm) return;

    try {
      setIsDeleting(true);
      const token = await getToken();
      if (!token) return;
      await deleteProjectApi(project._id, token);
      notifyProjectsChanged();
      notifyTasksChanged();
      router.push('/projects');
    } catch (err: any) {
      alert(err?.message || 'Failed to delete project.');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="w-8 h-8 text-[#d8f870] animate-spin" />
        <p className="text-xs text-zinc-500 font-medium">Loading project details...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl rounded-3xl p-8 border border-zinc-200 text-center space-y-4 max-w-md mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
          <FolderKanban className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Project Not Found</h3>
        <p className="text-xs text-zinc-500">
          The project you are looking for may have been archived or deleted.
        </p>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </Link>
      </div>
    );
  }

  const teamRoster = project.teamMemberProfiles || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumbs & Quick Action */}
      <div className="flex items-center justify-between">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Projects</span>
          <span className="text-zinc-400">/</span>
          <span className="text-zinc-800 dark:text-zinc-200 font-bold truncate max-w-xs">
            {project.name}
          </span>
        </Link>

        <button
          onClick={() => handleOpenAddTask()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#d8f870] hover:bg-[#c4ea48] text-zinc-950 text-xs font-bold shadow-md shadow-[#d8f870]/10 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Project Hero Header Card */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl border border-zinc-200/80 dark:border-white/[0.08] shadow-sm space-y-6 relative overflow-hidden transition-colors">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#d8f870]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative">
          <div className="space-y-2 max-w-2xl">
            {/* Status, Privacy & Role Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#d8f870]/15 text-zinc-900 dark:text-[#d8f870] border border-[#d8f870]/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d8f870]" />
                <span>{project.status}</span>
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.08] flex items-center gap-1">
                {project.privacy === 'Private' ? (
                  <Lock className="w-3 h-3 text-amber-400" />
                ) : (
                  <Globe className="w-3 h-3 text-emerald-400" />
                )}
                <span>{project.privacy === 'Private' ? 'Private' : 'Public'}</span>
              </span>

              {/* Your Project Role Pill */}
              <span
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-bold border',
                  isAdmin
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : isModerator
                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                )}
              >
                Role: {currentUserRole}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {project.name}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              {project.description || 'No description provided for this project.'}
            </p>
          </div>

          {/* Join Code & Progress Widget */}
          <div className="flex flex-col sm:flex-row lg:flex-col sm:items-center lg:items-end gap-4 shrink-0">
            {/* Join Code Box */}
            <div className="p-3 px-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] flex items-center gap-3">
              <KeyRound className="w-4 h-4 text-lime-500" />
              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Join Code</p>
                <p className="text-sm font-mono font-bold tracking-widest text-zinc-900 dark:text-white">{project.joinCode}</p>
              </div>
              <button
                onClick={handleCopyJoinCode}
                className="p-1.5 rounded-lg bg-zinc-200 dark:bg-white/[0.1] hover:bg-zinc-300 dark:hover:bg-white/[0.2] transition-colors text-zinc-700 dark:text-zinc-200 text-xs flex items-center gap-1 font-medium ml-1"
                title="Copy Join Code"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Completion Gauge */}
            <div className="space-y-1.5 w-full sm:w-48">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-zinc-500 dark:text-zinc-400">Task Completion</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                  {progressMetrics.pct}%
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#2ecc8f] to-[#d8f870] rounded-full transition-all"
                  style={{ width: `${progressMetrics.pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 pt-4 border-t border-zinc-100 dark:border-white/[0.08] overflow-x-auto scrollbar-none">
          {[
            { id: 'board', label: 'Board (Kanban)', icon: Kanban },
            { id: 'list', label: 'List View', icon: List },
            { id: 'conversation', label: 'Conversation', icon: MessageSquare },
            { id: 'overview', label: 'Overview & Goals', icon: FileText },
            { id: 'settings', label: 'Settings & Team', icon: Settings2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all relative',
                  isActive
                    ? 'bg-zinc-900 dark:bg-white/[0.12] text-white dark:text-[#d8f870] shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/[0.04]'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.id === 'conversation' && channelUnread > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-bold text-[10px] animate-pulse">
                    {channelUnread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab: Conversation */}
      {activeTab === 'conversation' && (
        <ProjectConversationTab
          projectId={String(project._id)}
          projectName={project.name}
        />
      )}

      {/* Tab: Kanban Board */}
      {activeTab === 'board' && (
        <ProjectKanbanBoard
          tasks={tasks}
          onMoveTask={moveTask}
          onEditTask={handleOpenEditTask}
          onSelectTask={handleOpenTaskDetail}
          onDeleteTask={deleteTask}
          onAddTaskToColumn={handleOpenAddTask}
          members={teamRoster}
        />
      )}

      {/* Tab: List View */}
      {activeTab === 'list' && (
        <ProjectTaskTable
          tasks={tasks}
          onEditTask={handleOpenEditTask}
          onSelectTask={handleOpenTaskDetail}
          onDeleteTask={deleteTask}
        />
      )}

      {/* Tab: Overview & Goals */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Goals & Milestones */}
          <div className="lg:col-span-2 space-y-6">
            {/* High-Level Goals */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl border border-zinc-200/80 dark:border-white/[0.08] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    High-Level Goals
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Key strategic targets for this project delivery
                  </p>
                </div>
                <span className="text-xs font-mono text-[#2ecc8f] font-bold">
                  {project.goals?.filter((g) => g.completed).length || 0}/
                  {project.goals?.length || 0} Complete
                </span>
              </div>

              <div className="space-y-2">
                {project.goals && project.goals.length > 0 ? (
                  project.goals.map((goal, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleToggleGoal(idx)}
                      className={cn(
                        'flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer group hover:border-[#d8f870]/40',
                        goal.completed
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-zinc-500 dark:text-zinc-400'
                          : 'bg-zinc-50/50 dark:bg-white/[0.02] border-zinc-200/80 dark:border-white/[0.06]'
                      )}
                    >
                      <div
                        className={cn(
                          'w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all',
                          goal.completed
                            ? 'bg-[#d8f870] border-[#d8f870] text-zinc-950'
                            : 'border-zinc-400 dark:border-zinc-600 group-hover:border-[#d8f870]'
                        )}
                      >
                        {goal.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'text-xs font-bold transition-colors',
                            goal.completed
                              ? 'line-through text-zinc-400 dark:text-zinc-500'
                              : 'text-zinc-900 dark:text-zinc-100'
                          )}
                        >
                          {goal.title}
                        </p>
                        {goal.description && (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            {goal.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-400 py-4 text-center">
                    No strategic goals added yet. Add them in project settings.
                  </p>
                )}
              </div>
            </div>

            {/* Milestones Section */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl border border-zinc-200/80 dark:border-white/[0.08] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Project Milestones
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Major phase deliverables and progress
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {project.milestones && project.milestones.length > 0 ? (
                  project.milestones.map((ms, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-zinc-50/50 dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/[0.06] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                            ms.status === 'Completed'
                              ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                              : ms.status === 'InProgress'
                              ? 'bg-[#d8f870]/15 text-[#d8f870] border border-[#d8f870]/30'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          )}
                        >
                          {ms.status}
                        </span>
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                          {ms.progress}%
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {ms.title}
                        </h4>
                        {ms.description && (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                            {ms.description}
                          </p>
                        )}
                      </div>

                      <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#2ecc8f] to-[#d8f870] rounded-full"
                          style={{ width: `${ms.progress}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-400 py-4 text-center col-span-2">
                    No milestones defined yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Project Team Roster */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl border border-zinc-200/80 dark:border-white/[0.08] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#2ecc8f]" />
                    <span>Project Team ({teamRoster.length})</span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Collaborators in this project
                  </p>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsEditTeamModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-white/[0.08] hover:bg-zinc-200 dark:hover:bg-white/[0.14] text-zinc-900 dark:text-[#d8f870] transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Manage Roles</span>
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {teamRoster.length > 0 ? (
                  teamRoster.map((m) => (
                    <div
                      key={m.userId}
                      className="flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-50/50 dark:bg-white/[0.02] border border-zinc-200/60 dark:border-white/[0.04]"
                    >
                      <div className="w-8 h-8 rounded-full bg-zinc-800 text-[#d8f870] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                        {m.imageUrl ? (
                          <img
                            src={m.imageUrl}
                            alt={m.name || 'Member'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (m.name || 'U').slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {m.name || 'Project Member'}
                          </p>
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0',
                              m.projectRole === 'Admin'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                : m.projectRole === 'Moderator'
                                ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
                                : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                            )}
                          >
                            {m.projectRole || 'Member'}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate font-mono">
                          {m.email || m.userId}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-400 py-3 text-center">
                    No team members assigned.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Project Settings */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* General Settings */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl border border-zinc-200/80 dark:border-white/[0.08] shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Project Settings
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Update name, status, and join options
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              {settingsSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Project settings updated successfully!</span>
                </div>
              )}

              {settingsError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {settingsError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  disabled={!canManageSettings}
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#d8f870] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Description
                </label>
                <textarea
                  rows={3}
                  disabled={!canManageSettings}
                  value={settingsDesc}
                  onChange={(e) => setSettingsDesc(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#d8f870] transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Status
                  </label>
                  <select
                    value={settingsStatus}
                    disabled={!canManageSettings}
                    onChange={(e) => setSettingsStatus(e.target.value as ProjectStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#d8f870]"
                  >
                    <option value="ActiveSprint">Active Sprint</option>
                    <option value="OnTrack">On Track</option>
                    <option value="AtRisk">At Risk</option>
                    <option value="Completed">Completed</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Privacy
                  </label>
                  <select
                    value={settingsPrivacy}
                    disabled={!canManageSettings}
                    onChange={(e) => setSettingsPrivacy(e.target.value as ProjectPrivacy)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#d8f870]"
                  >
                    <option value="Public">Public (Join via Code)</option>
                    <option value="Private">Private (Invite Only)</option>
                  </select>
                </div>
              </div>

              {canManageSettings && (
                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#d8f870] hover:bg-[#c4ea48] text-zinc-950 flex items-center gap-1.5 transition-all shadow-md shadow-[#d8f870]/10"
                  >
                    {isSavingSettings ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Join Code Reset Widget (Admin Only) */}
          {isAdmin && (
            <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl border border-zinc-200/80 dark:border-white/[0.08] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-lime-500" />
                    <span>Project Join Code</span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Share this 6-character code to allow team members to join this project instantly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetJoinCode}
                  disabled={isResettingCode}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-white/[0.08] hover:bg-zinc-200 dark:hover:bg-white/[0.14] text-zinc-900 dark:text-zinc-200 transition-colors"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isResettingCode && "animate-spin")} />
                  <span>Reset Code</span>
                </button>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08]">
                <p className="text-lg font-mono font-bold tracking-[0.2em] text-zinc-900 dark:text-white">
                  {project.joinCode}
                </p>
                <button
                  onClick={handleCopyJoinCode}
                  className="px-3 py-1.5 rounded-xl bg-lime-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Danger Zone (Admin Only) */}
          {isAdmin && (
            <div className="p-6 rounded-3xl bg-rose-500/5 border border-rose-500/20 space-y-3">
              <h4 className="text-xs font-bold text-rose-500 uppercase tracking-wider">
                Danger Zone
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Deleting this project will permanently remove it and all of its associated tasks.
              </p>
              <button
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Project'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        task={selectedDetailTask}
        projectName={project.name}
        userProjectRole={currentUserRole}
        members={teamRoster}
        onEditTask={(taskToEdit) => {
          setIsDetailModalOpen(false);
          handleOpenEditTask(taskToEdit);
        }}
        onTaskUpdated={() => {
          refreshTasks();
        }}
        onTaskDeleted={() => {
          refreshTasks();
        }}
      />

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        task={editingTask}
        defaultStatus={defaultTaskStatus}
        projectId={project._id}
        members={teamRoster}
      />

      {/* Edit Team Modal */}
      <EditTeamModal
        isOpen={isEditTeamModalOpen}
        onClose={() => setIsEditTeamModalOpen(false)}
        projectId={project._id}
        projectName={project.name}
        currentUserRole={currentUserRole}
        teamMemberProfiles={teamRoster}
        onTeamUpdated={() => {
          loadProject();
          refreshTasks();
        }}
      />
    </div>
  );
}
