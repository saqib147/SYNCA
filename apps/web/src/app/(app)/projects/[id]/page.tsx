'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
} from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useTasks, notifyTasksChanged } from '@/hooks/useTasks';
import { notifyProjectsChanged } from '@/hooks/useProjects';
import {
  fetchProjectById,
  updateProjectApi,
  deleteProjectApi,
  EnrichedProject,
} from '@/lib/api/project.api';
import { ProjectKanbanBoard } from '@/components/project/ProjectKanbanBoard';
import { ProjectTaskTable } from '@/components/project/ProjectTaskTable';
import { TaskModal } from '@/components/task/TaskModal';
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
  const { activeWorkspace } = useWorkspace();

  const [project, setProject] = useState<EnrichedProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'board' | 'list' | 'settings'>('board');

  // Permissions & Role calculations
  const isWorkspaceAdmin = useMemo(() => {
    if (!user?.id || !activeWorkspace) return false;
    const member = activeWorkspace.members.find((m) => m.userId === user.id);
    return member?.role === 'owner' || member?.role === 'admin' || activeWorkspace.ownerId === user.id;
  }, [user?.id, activeWorkspace]);

  const isTeamMember = useMemo(() => {
    if (!user?.id || !project) return false;
    return project.teamMembers?.includes(user.id) ?? false;
  }, [user?.id, project]);

  const userProjectRole = useMemo(() => {
    if (!user?.id || !project) return undefined;
    const profile = project.teamMemberProfiles?.find((p) => p.userId === user.id);
    return profile?.projectRole;
  }, [user?.id, project]);

  const isProjectAdmin = isWorkspaceAdmin || userProjectRole === 'Admin';
  const isProjectViewer = userProjectRole === 'Viewer' && !isWorkspaceAdmin;

  // Workspace admins or assigned team members (even Viewers) can view tasks & board
  const canViewProjectTasks = isWorkspaceAdmin || isTeamMember;
  // Workspace admins or non-viewer team members can add/edit tasks
  const canManageProject = isWorkspaceAdmin || (isTeamMember && !isProjectViewer);
  // Project Admin or Workspace Admin can edit team and settings
  const canEditProjectTeam = isProjectAdmin;

  // Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultTaskStatus, setDefaultTaskStatus] = useState('To Do');

  // Edit Team Modal state
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);

  // Project Settings form state
  const [settingsName, setSettingsName] = useState('');
  const [settingsDesc, setSettingsDesc] = useState('');
  const [settingsStatus, setSettingsStatus] = useState<ProjectStatus>('ActiveSprint');
  const [settingsPrivacy, setSettingsPrivacy] = useState<ProjectPrivacy>('RoomWide');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Auto-lock tab to 'overview' if non-team member on WorkspaceWide project
  useEffect(() => {
    if (!isLoading && project && !canViewProjectTasks) {
      setActiveTab('overview');
    }
  }, [isLoading, project, canViewProjectTasks]);

  // Load project
  useEffect(() => {
    let isMounted = true;

    async function loadProject() {
      try {
        setIsLoading(true);
        const token = await getToken();
        if (!token) return;

        const fetched = await fetchProjectById(id, token);
        if (isMounted && fetched) {
          setProject(fetched);
          setSettingsName(fetched.name);
          setSettingsDesc(fetched.description || '');
          setSettingsStatus(fetched.status);
          setSettingsPrivacy(fetched.privacy);
        }
      } catch (err) {
        console.error('[ProjectDetailPage] Failed to load project:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadProject();

    return () => {
      isMounted = false;
    };
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
    if (!project || !project.goals || !canManageProject) return;
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
    if (!project) return;

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
    if (!project) return;
    const confirm = window.confirm(
      `Are you sure you want to archive "${project.name}"? Tasks and milestones will be archived.`
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
          The project you are looking for may have been archived or removed from this workspace.
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

        {canManageProject && (
          <button
            onClick={() => handleOpenAddTask()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#d8f870] hover:bg-[#c4ea48] text-zinc-950 text-xs font-bold shadow-md shadow-[#d8f870]/10 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        )}
      </div>

      {/* Read-Only Notice for Non-Team Members or Viewers */}
      {!canManageProject && (
        <div className="p-3.5 px-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 shrink-0 text-amber-500" />
            <p>
              <span className="font-bold">
                {isProjectViewer ? 'Project Viewer Access:' : 'Workspace View Only:'}
              </span>{' '}
              {isProjectViewer
                ? 'You have Viewer access to this project. You can inspect the board and tasks in read-only mode.'
                : 'You are viewing this workspace project in Read-Only mode. Only assigned project team members and workspace admins can access the task board.'}
            </p>
          </div>
        </div>
      )}

      {/* Project Hero Header Card */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl border border-zinc-200/80 dark:border-white/[0.08] shadow-sm space-y-6 relative overflow-hidden transition-colors">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#d8f870]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative">
          <div className="space-y-2 max-w-2xl">
            {/* Status & Privacy Pills */}
            <div className="flex items-center gap-2">
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
                <span>{project.privacy === 'Private' ? 'Private' : 'Workspace-Wide'}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {project.name}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              {project.description || 'No description provided for this project.'}
            </p>
          </div>

          {/* Progress & Team Meta Strip */}
          <div className="flex flex-col sm:flex-row lg:flex-col sm:items-center lg:items-end gap-4 shrink-0">
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
              <p className="text-[10px] text-zinc-400 text-right font-mono">
                {progressMetrics.completed} of {progressMetrics.total} tasks done
              </p>
            </div>

            {/* Team Roster Avatars */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-400 font-medium">Team:</span>
              <div className="flex -space-x-2 overflow-hidden">
                {teamRoster.slice(0, 5).map((member, idx) => (
                  <div
                    key={idx}
                    title={member.name || member.email}
                    className="w-7 h-7 rounded-full ring-2 ring-white dark:ring-[#141822] bg-zinc-800 text-[#d8f870] font-bold text-[10px] flex items-center justify-center shrink-0 overflow-hidden"
                  >
                    {member.imageUrl ? (
                      <img
                        src={member.imageUrl}
                        alt={member.name || 'Member'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (member.name || 'U').slice(0, 2).toUpperCase()
                    )}
                  </div>
                ))}
              </div>
              {canEditProjectTeam && (
                <button
                  type="button"
                  onClick={() => setIsEditTeamModalOpen(true)}
                  title="Manage Project Team"
                  className="w-7 h-7 rounded-full border border-dashed border-zinc-400 dark:border-zinc-600 hover:border-[#d8f870] flex items-center justify-center text-zinc-400 hover:text-[#d8f870] text-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 pt-4 border-t border-zinc-100 dark:border-white/[0.08] overflow-x-auto scrollbar-none">
          {[
            { id: 'board', label: 'Board (Kanban)', icon: Kanban, restricted: !canViewProjectTasks },
            { id: 'list', label: 'List View', icon: List, restricted: !canViewProjectTasks },
            { id: 'overview', label: 'Overview & Goals', icon: FileText, restricted: false },
            { id: 'settings', label: 'Settings', icon: Settings2, restricted: !canEditProjectTeam },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isLocked = tab.restricted;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (!isLocked) {
                    setActiveTab(tab.id as any);
                  }
                }}
                disabled={isLocked}
                title={isLocked ? 'Assigned Team Members Only' : tab.label}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all',
                  isLocked && 'opacity-40 cursor-not-allowed hover:bg-transparent text-zinc-400',
                  !isLocked && isActive && 'bg-zinc-900 dark:bg-white/[0.12] text-white dark:text-[#d8f870] shadow-sm',
                  !isLocked && !isActive && 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/[0.04]'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {isLocked && <Lock className="w-3 h-3 ml-0.5 text-zinc-500" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab: Kanban Board */}
      {activeTab === 'board' && (
        <ProjectKanbanBoard
          tasks={tasks}
          onMoveTask={moveTask}
          onEditTask={handleOpenEditTask}
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
                      onClick={() => canManageProject && handleToggleGoal(idx)}
                      className={cn(
                        'flex items-center gap-3 p-3.5 rounded-2xl border transition-all',
                        canManageProject ? 'cursor-pointer group hover:border-[#d8f870]/40' : 'cursor-default',
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
                            : cn(
                                'border-zinc-400 dark:border-zinc-600',
                                canManageProject && 'group-hover:border-[#d8f870]'
                              )
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
                    <span>Assigned Team ({teamRoster.length})</span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Collaborators with full access to this initiative
                  </p>
                </div>
                {canEditProjectTeam && (
                  <button
                    type="button"
                    onClick={() => setIsEditTeamModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-white/[0.08] hover:bg-zinc-200 dark:hover:bg-white/[0.14] text-zinc-900 dark:text-[#d8f870] transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Manage Team</span>
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
                            {m.name || 'Workspace Member'}
                          </p>
                          {m.projectRole === 'Admin' ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                              Admin / PM
                            </span>
                          ) : m.projectRole === 'Viewer' ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 shrink-0">
                              Viewer
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                              Contributor
                            </span>
                          )}
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
                Update name, status, scope, and visibility
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
                    onChange={(e) => setSettingsPrivacy(e.target.value as ProjectPrivacy)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#d8f870]"
                  >
                    <option value="RoomWide">Workspace-Wide</option>
                    <option value="Private">Private</option>
                  </select>
                </div>
              </div>

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
            </form>
          </div>

          {/* Team Roster Management */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl border border-zinc-200/80 dark:border-white/[0.08] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#d8f870]" />
                  <span>Project Team ({teamRoster.length} members)</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Control which workspace members have full contributor access to this project.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditTeamModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-zinc-900 dark:bg-white/[0.12] text-white dark:text-[#d8f870] hover:bg-zinc-800 dark:hover:bg-white/[0.18] transition-all shadow-sm shrink-0 self-start sm:self-auto"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add / Remove Members</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {teamRoster.length > 0 ? (
                teamRoster.map((m) => (
                  <div
                    key={m.userId}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.06] text-xs"
                  >
                    <div className="w-5 h-5 rounded-full bg-zinc-800 text-[#d8f870] text-[10px] font-bold flex items-center justify-center overflow-hidden">
                      {m.imageUrl ? (
                        <img src={m.imageUrl} alt={m.name || 'U'} className="w-full h-full object-cover" />
                      ) : (
                        (m.name || 'U').slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {m.name || m.email}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-400 py-1">No team members assigned yet.</p>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="p-6 rounded-3xl bg-rose-500/5 border border-rose-500/20 space-y-3">
            <h4 className="text-xs font-bold text-rose-500 uppercase tracking-wider">
              Danger Zone
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Archiving this project hides it from the portfolio and locks all child tasks.
            </p>
            <button
              onClick={handleDeleteProject}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Archiving...' : 'Archive Project'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        task={editingTask}
        defaultStatus={defaultTaskStatus}
        projectId={project._id}
        workspaceId={project.workspaceId}
        members={teamRoster}
      />

      {/* Edit Team Modal */}
      <EditTeamModal
        isOpen={isEditTeamModalOpen}
        onClose={() => setIsEditTeamModalOpen(false)}
        projectId={project._id}
        projectName={project.name}
        currentTeamMembers={project.teamMembers || []}
        currentMembers={project.teamMemberProfiles || []}
        onTeamUpdated={(updatedProject) => {
          setProject((prev) => (prev ? { ...prev, ...updatedProject } : null));
          refreshTasks();
        }}
      />
    </div>
  );
}
