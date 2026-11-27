'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import {
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  UserPlus,
  CheckCircle2,
  Plus,
  Settings2,
  FileText,
  Trash2,
  Lock,
  Globe,
  Loader2,
  Check,
  KeyRound,
  Copy,
  RefreshCw,
  MessageSquare,
  Link2,
  LogOut,
  Search,
  Flag,
  Rocket,
  Target,
  Zap,
  Share2,
  Edit2,
  X,
} from 'lucide-react';
import { useTasks, notifyTasksChanged } from '@/hooks/useTasks';
import { notifyProjectsChanged, getCachedProjectById } from '@/hooks/useProjects';
import {
  fetchProjectById,
  updateProjectApi,
  deleteProjectApi,
  regenerateJoinCodeApi,
  removeMemberApi,
  EnrichedProject,
} from '@/lib/api/project.api';
import { ProjectKanbanBoard } from '@/components/project/ProjectKanbanBoard';
import { ProjectTaskTable } from '@/components/project/ProjectTaskTable';
import { ProjectConversationTab } from '@/components/project/ProjectConversationTab';
import { useChatNotifications } from '@/context/ChatNotificationContext';
import { TaskModal } from '@/components/task/TaskModal';
import { TaskDetailModal } from '@/components/task/TaskDetailModal';
import { EditTeamModal } from '@/components/project/EditTeamModal';
import {
  Task,
  ProjectStatus,
  ProjectPrivacy,
  MilestoneStatus,
} from '@synca/types';
import { cn } from '@/lib/utils';

type ProjectTab = 'overview' | 'board' | 'list' | 'conversation' | 'settings';

const STATUS_BADGE_MAP: Record<
  ProjectStatus,
  { label: string; pill: string; dot: string }
> = {
  OnTrack: {
    label: 'On Track',
    pill: 'bg-[#ddec6b] dark:bg-[#F0FF7C]/15 text-[#606a00] dark:text-[#F0FF7C]',
    dot: 'bg-[#5a6400] dark:bg-[#F0FF7C]',
  },
  ActiveSprint: {
    label: 'Active Sprint',
    pill: 'bg-[#e7e8e9] dark:bg-white/[0.08] border border-[#bdc9c2] dark:border-white/[0.14] text-[#191c1d] dark:text-zinc-200',
    dot: 'bg-[#006c52] dark:bg-[#79deba]',
  },
  AtRisk: {
    label: 'At Risk',
    pill: 'bg-[#ffdad6] dark:bg-rose-500/15 text-[#93000a] dark:text-rose-300',
    dot: 'bg-[#ba1a1a] dark:bg-rose-400',
  },
  Completed: {
    label: 'Completed',
    pill: 'bg-[#d3f5e8] dark:bg-emerald-500/15 text-[#006c52] dark:text-emerald-300',
    dot: 'bg-[#006c52] dark:bg-emerald-400',
  },
  Archived: {
    label: 'Archived',
    pill: 'bg-[#e7e8e9] dark:bg-white/[0.08] text-[#3e4944] dark:text-zinc-400',
    dot: 'bg-[#6b7280]',
  },
};

// Per-project detail cache so navigating back to a visited project renders in 0ms
const projectDetailCache = new Map<string, EnrichedProject>();

export default function ProjectDetailPage({
  params: routeParams,
}: {
  params?: { id?: string };
}) {
  const params = useParams();
  const id = ((params?.id as string) || routeParams?.id || '') as string;
  const router = useRouter();
  const { getToken, userId } = useAuth();
  const { unreadCounts } = useChatNotifications();

  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const initialSeed = useMemo(() => {
    const cached = projectDetailCache.get(id);
    if (cached) return cached;
    const summary = getCachedProjectById(id);
    return summary ? (summary as EnrichedProject) : null;
  }, [id]);

  const [project, setProject] = useState<EnrichedProject | null>(initialSeed);
  const [isLoading, setIsLoading] = useState<boolean>(() => !initialSeed);
  const [activeTab, setActiveTab] = useState<ProjectTab>(() => {
    if (
      tabParam &&
      ['overview', 'board', 'list', 'settings', 'conversation'].includes(
        tabParam
      )
    ) {
      return tabParam as ProjectTab;
    }
    return 'overview';
  });

  const [taskSearch, setTaskSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isResettingCode, setIsResettingCode] = useState(false);

  const channelUnread =
    unreadCounts[`channel_${String(project?._id || '')}`] || 0;

  useEffect(() => {
    if (
      tabParam &&
      ['overview', 'board', 'list', 'settings', 'conversation'].includes(
        tabParam
      )
    ) {
      setActiveTab(tabParam as ProjectTab);
    }
  }, [tabParam]);

  // Role calculation
  const currentUserRole = project?.currentUserRole || 'Member';
  const isAdmin = currentUserRole === 'Admin';
  const isModerator = currentUserRole === 'Moderator';
  const canManageSettings = isAdmin || isModerator;

  // Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultTaskColumn, setDefaultTaskColumn] = useState<string | undefined>(undefined);

  // Task Detail Modal state
  const [selectedDetailTask, setSelectedDetailTask] = useState<Task | null>(
    null
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Edit Team Modal state
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);

  // Goal & Milestone inline creation state
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMsTitle, setNewMsTitle] = useState('');
  const [newMsDesc, setNewMsDesc] = useState('');
  const [newMsDate, setNewMsDate] = useState('');

  // Inline editing state (Brief, Goals, Milestones)
  const [isEditingBrief, setIsEditingBrief] = useState(false);
  const [briefDraft, setBriefDraft] = useState('');
  const [isSavingBrief, setIsSavingBrief] = useState(false);

  const [editingGoalIdx, setEditingGoalIdx] = useState<number | null>(null);
  const [editGoalTitle, setEditGoalTitle] = useState('');
  const [editGoalDesc, setEditGoalDesc] = useState('');

  const [editingMsIdx, setEditingMsIdx] = useState<number | null>(null);
  const [editMsTitle, setEditMsTitle] = useState('');
  const [editMsDesc, setEditMsDesc] = useState('');
  const [editMsStatus, setEditMsStatus] = useState<MilestoneStatus>('Upcoming');
  const [editMsProgress, setEditMsProgress] = useState<number>(0);
  const [editMsDate, setEditMsDate] = useState('');

  // Project Settings form state
  const [settingsName, setSettingsName] = useState('');
  const [settingsDesc, setSettingsDesc] = useState('');
  const [settingsStatus, setSettingsStatus] =
    useState<ProjectStatus>('ActiveSprint');
  const [settingsPrivacy, setSettingsPrivacy] =
    useState<ProjectPrivacy>('Public');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadProject = async (silent = false) => {
    try {
      const hasCached = projectDetailCache.has(id) || Boolean(getCachedProjectById(id));
      if (!silent && !hasCached) {
        setIsLoading(true);
      }
      const token = await getToken();
      if (!token) return;

      const fetched = await fetchProjectById(id, token);
      if (fetched) {
        projectDetailCache.set(id, fetched);
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
    const cached = projectDetailCache.get(id) || (getCachedProjectById(id) as EnrichedProject | null);
    if (cached) {
      setProject(cached);
      setSettingsName(cached.name);
      setSettingsDesc(cached.description || '');
      setSettingsStatus(cached.status);
      setSettingsPrivacy(cached.privacy);
      setIsLoading(false);
    }
    loadProject(Boolean(cached));
  }, [id, getToken]);

  // Fetch tasks in parallel with project details using route `id` (eliminates sequential waterfall)
  const {
    tasks,
    setTasks,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
    refreshTasks,
  } = useTasks(id || project?._id);

  // Filtered tasks for Board & List tabs
  const filteredTasks = useMemo(() => {
    const q = taskSearch.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [tasks, taskSearch]);

  const progressMetrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'Done').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pct };
  }, [tasks]);

  // Ordered board columns (empty by default; preserves project.columns order + any legacy task columns)
  const boardColumns = useMemo(() => {
    const ordered = Array.isArray(project?.columns) ? [...project.columns] : [];
    const seen = new Set(ordered);
    tasks.forEach((t) => {
      const col = t.column?.trim() || 'Default Column';
      if (!seen.has(col)) {
        seen.add(col);
        ordered.push(col);
      }
    });
    return ordered;
  }, [project?.columns, tasks]);

  const handleColumnsChange = async (nextColumns: string[]) => {
    if (!project) return;
    const previousColumns = project.columns || [];
    setProject({ ...project, columns: nextColumns });

    try {
      const token = await getToken();
      if (!token) throw new Error('Session expired');
      const updated = await updateProjectApi(
        project._id,
        { columns: nextColumns },
        token
      );
      setProject((prev) =>
        prev ? { ...prev, columns: updated.columns ?? nextColumns } : null
      );
    } catch (err) {
      console.error('Failed to update board columns:', err);
      setProject((prev) =>
        prev ? { ...prev, columns: previousColumns } : null
      );
    }
  };

  const handleRenameColumn = async (oldName: string, newName: string) => {
    if (!project) return;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;

    const previousColumns = project.columns || [];
    const nextColumns = Array.from(
      new Set(boardColumns.map((c) => (c === oldName ? trimmed : c)))
    );

    // Optimistic update on both project columns and tasks belonging to oldName
    setProject({ ...project, columns: nextColumns });
    setTasks((prev) =>
      prev.map((t) =>
        (t.column || 'Default Column') === oldName
          ? { ...t, column: trimmed }
          : t
      )
    );

    try {
      const token = await getToken();
      if (!token) throw new Error('Session expired');
      const updated = await updateProjectApi(
        project._id,
        { renameColumn: { from: oldName, to: trimmed } },
        token
      );
      setProject((prev) =>
        prev ? { ...prev, columns: updated.columns ?? nextColumns } : null
      );
      notifyTasksChanged();
    } catch (err) {
      console.error('Failed to rename column:', err);
      setProject((prev) =>
        prev ? { ...prev, columns: previousColumns } : null
      );
      refreshTasks();
    }
  };

  const handleOpenTaskDetail = (task: Task) => {
    setSelectedDetailTask(task);
    setIsDetailModalOpen(true);
  };

  const handleOpenAddTask = (column?: string) => {
    setEditingTask(null);
    setDefaultTaskColumn(column);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (data: any) => {
    if (editingTask) {
      const updated = await updateTask(editingTask._id, data);
      if (
        updated?.column &&
        project &&
        !(project.columns || []).includes(updated.column)
      ) {
        setProject((prev) =>
          prev
            ? { ...prev, columns: [...(prev.columns || []), updated.column!] }
            : null
        );
      }
    } else {
      const created = await createTask(data);
      // Reflect auto-created "Default Column" or newly selected column immediately
      if (
        created?.column &&
        project &&
        !(project.columns || []).includes(created.column)
      ) {
        setProject((prev) =>
          prev
            ? { ...prev, columns: [...(prev.columns || []), created.column!] }
            : null
        );
      }
    }
  };

  const handleCopyJoinCode = () => {
    if (!project?.joinCode) return;
    navigator.clipboard.writeText(project.joinCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyInviteLink = () => {
    if (!project?.joinCode || typeof window === 'undefined') return;
    const url = `${window.location.origin}/projects/join?code=${project.joinCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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

  // Goals CRUD
  const handleToggleGoal = async (goalIndex: number) => {
    if (!project || !project.goals || !canManageSettings) return;
    const previousGoals = project.goals;
    const updatedGoals = project.goals.map((g, idx) =>
      idx === goalIndex ? { ...g, completed: !g.completed } : g
    );
    setProject({ ...project, goals: updatedGoals });

    try {
      const token = await getToken();
      if (!token) throw new Error('Session expired');
      await updateProjectApi(
        project._id,
        { goals: updatedGoals as any },
        token
      );
      notifyProjectsChanged();
    } catch (err) {
      console.error('Failed to toggle goal:', err);
      setProject((prev) => (prev ? { ...prev, goals: previousGoals } : null));
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !canManageSettings || !newGoalTitle.trim()) return;
    const previousGoals = project.goals || [];
    const updatedGoals = [
      ...previousGoals,
      { title: newGoalTitle.trim(), completed: false },
    ];
    setNewGoalTitle('');
    setProject({ ...project, goals: updatedGoals });

    try {
      const token = await getToken();
      if (!token) throw new Error('Session expired');
      const updated = await updateProjectApi(
        project._id,
        { goals: updatedGoals as any },
        token
      );
      setProject((prev) => (prev ? { ...prev, ...updated } : null));
      notifyProjectsChanged();
    } catch (err) {
      console.error('Failed to add goal:', err);
      setProject((prev) => (prev ? { ...prev, goals: previousGoals } : null));
    }
  };

  const handleDeleteGoal = async (goalIndex: number) => {
    if (!project || !project.goals || !canManageSettings) return;
    const previousGoals = project.goals;
    const updatedGoals = project.goals.filter((_, idx) => idx !== goalIndex);
    setProject({ ...project, goals: updatedGoals });
    if (editingGoalIdx === goalIndex) setEditingGoalIdx(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Session expired');
      await updateProjectApi(
        project._id,
        { goals: updatedGoals as any },
        token
      );
      notifyProjectsChanged();
    } catch (err) {
      console.error('Failed to delete goal:', err);
      setProject((prev) => (prev ? { ...prev, goals: previousGoals } : null));
    }
  };

  const startEditGoal = (idx: number) => {
    const goal = project?.goals?.[idx];
    if (!goal) return;
    setEditingGoalIdx(idx);
    setEditGoalTitle(goal.title);
    setEditGoalDesc(goal.description || '');
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !project ||
      !project.goals ||
      !canManageSettings ||
      editingGoalIdx === null ||
      !editGoalTitle.trim()
    ) {
      return;
    }
    const previousGoals = project.goals;
    const updatedGoals = project.goals.map((g, idx) =>
      idx === editingGoalIdx
        ? {
            ...g,
            title: editGoalTitle.trim(),
            description: editGoalDesc.trim() || undefined,
          }
        : g
    );
    setEditingGoalIdx(null);
    setProject({ ...project, goals: updatedGoals });

    try {
      const token = await getToken();
      if (!token) throw new Error('Session expired');
      await updateProjectApi(
        project._id,
        { goals: updatedGoals as any },
        token
      );
      notifyProjectsChanged();
    } catch (err) {
      console.error('Failed to update goal:', err);
      setProject((prev) => (prev ? { ...prev, goals: previousGoals } : null));
    }
  };

  const handleSaveBrief = async () => {
    if (!project || !canManageSettings) return;
    const trimmed = briefDraft.trim();
    const previousDesc = project.description || '';

    // Optimistic update for instant feedback
    const optimisticProject = { ...project, description: trimmed };
    projectDetailCache.set(id, optimisticProject);
    setProject(optimisticProject);
    setSettingsDesc(trimmed);
    setIsEditingBrief(false);

    try {
      setIsSavingBrief(true);
      const token = await getToken();
      if (!token) return;
      const updated = await updateProjectApi(
        project._id,
        { description: trimmed },
        token
      );
      setProject((prev) => {
        if (!prev) return null;
        const next = { ...prev, ...updated, description: trimmed };
        projectDetailCache.set(id, next);
        return next;
      });
      notifyProjectsChanged();
    } catch (err) {
      console.error('Failed to update brief:', err);
      setProject((prev) => (prev ? { ...prev, description: previousDesc } : null));
      setSettingsDesc(previousDesc);
    } finally {
      setIsSavingBrief(false);
    }
  };

  const startEditMilestone = (idx: number) => {
    const ms = project?.milestones?.[idx];
    if (!ms) return;
    setEditingMsIdx(idx);
    setEditMsTitle(ms.title);
    setEditMsDesc(ms.description || '');
    setEditMsStatus(ms.status);
    setEditMsProgress(ms.progress ?? 0);
    setEditMsDate(
      ms.date ? new Date(ms.date).toISOString().slice(0, 10) : ''
    );
  };

  const handleSaveMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !project ||
      !project.milestones ||
      !canManageSettings ||
      editingMsIdx === null ||
      !editMsTitle.trim()
    ) {
      return;
    }
    const previousMilestones = project.milestones;
    const normalizedProgress =
      editMsStatus === 'Completed'
        ? 100
        : editMsStatus === 'Upcoming'
          ? 0
          : Math.min(100, Math.max(0, Number(editMsProgress) || 0));

    const updatedMilestones = project.milestones.map((ms, idx) =>
      idx === editingMsIdx
        ? {
            ...ms,
            title: editMsTitle.trim(),
            description: editMsDesc.trim() || undefined,
            status: editMsStatus,
            progress: normalizedProgress,
            date: editMsDate || undefined,
          }
        : ms
    );
    setEditingMsIdx(null);
    setProject({ ...project, milestones: updatedMilestones });

    try {
      const token = await getToken();
      if (!token) throw new Error('Session expired');
      const updated = await updateProjectApi(
        project._id,
        { milestones: updatedMilestones as any },
        token
      );
      setProject((prev) => (prev ? { ...prev, ...updated } : null));
    } catch (err) {
      console.error('Failed to update milestone:', err);
      setProject((prev) =>
        prev ? { ...prev, milestones: previousMilestones } : null
      );
    }
  };

  // Milestones CRUD
  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !canManageSettings || !newMsTitle.trim()) return;
    const previousMilestones = project.milestones || [];
    const newItem = {
      title: newMsTitle.trim(),
      description: newMsDesc.trim() || undefined,
      status: 'Upcoming' as MilestoneStatus,
      progress: 0,
      date: newMsDate || undefined,
    };
    const updatedMilestones = [...previousMilestones, newItem];
    setNewMsTitle('');
    setNewMsDesc('');
    setNewMsDate('');
    setShowAddMilestone(false);
    setProject({ ...project, milestones: updatedMilestones });

    try {
      const token = await getToken();
      if (!token) throw new Error('Session expired');
      const updated = await updateProjectApi(
        project._id,
        { milestones: updatedMilestones as any },
        token
      );
      setProject((prev) => (prev ? { ...prev, ...updated } : null));
    } catch (err) {
      console.error('Failed to add milestone:', err);
      setProject((prev) =>
        prev ? { ...prev, milestones: previousMilestones } : null
      );
    }
  };

  const handleCycleMilestoneStatus = async (msIndex: number) => {
    if (!project || !project.milestones || !canManageSettings) return;
    const previousMilestones = project.milestones;
    const nextMap: Record<
      MilestoneStatus,
      { status: MilestoneStatus; progress: number }
    > = {
      Upcoming: { status: 'InProgress', progress: 50 },
      InProgress: { status: 'Completed', progress: 100 },
      Completed: { status: 'Upcoming', progress: 0 },
    };
    const updatedMilestones = project.milestones.map((ms, idx) =>
      idx === msIndex ? { ...ms, ...nextMap[ms.status] } : ms
    );
    setProject({ ...project, milestones: updatedMilestones });

    try {
      const token = await getToken();
      if (!token) throw new Error('Session expired');
      await updateProjectApi(
        project._id,
        { milestones: updatedMilestones as any },
        token
      );
    } catch (err) {
      console.error('Failed to update milestone:', err);
      setProject((prev) =>
        prev ? { ...prev, milestones: previousMilestones } : null
      );
    }
  };

  const handleDeleteMilestone = async (msIndex: number) => {
    if (!project || !project.milestones || !canManageSettings) return;
    const previousMilestones = project.milestones;
    const updatedMilestones = project.milestones.filter(
      (_, idx) => idx !== msIndex
    );
    setProject({ ...project, milestones: updatedMilestones });

    try {
      const token = await getToken();
      if (!token) throw new Error('Session expired');
      await updateProjectApi(
        project._id,
        { milestones: updatedMilestones as any },
        token
      );
    } catch (err) {
      console.error('Failed to delete milestone:', err);
      setProject((prev) =>
        prev ? { ...prev, milestones: previousMilestones } : null
      );
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
      notifyProjectsChanged();
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err: any) {
      setSettingsError(err?.message || 'Failed to update project settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleLeaveProject = async () => {
    if (!project || !userId) return;
    const confirmed = window.confirm(
      `Leave "${project.name}"? You will lose access to its tasks and project channel until re-invited.`
    );
    if (!confirmed) return;

    try {
      setIsLeaving(true);
      const token = await getToken();
      if (!token) return;
      await removeMemberApi(project._id, userId, token);
      notifyProjectsChanged();
      router.push('/projects');
    } catch (err: any) {
      alert(err?.message || 'Could not leave project');
    } finally {
      setIsLeaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project || !isAdmin) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"? This project and all its tasks will be permanently deleted.`
    );
    if (!confirmed) return;

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
      <div className="h-full rounded-[20px] bg-white dark:bg-[#111316] border border-[#e5e5e5] dark:border-white/[0.08] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 text-[#006c52] dark:text-[#66deb4] animate-spin" />
        <p className="text-[14px] text-[#3e4944] dark:text-zinc-400">
          Loading project workspace...
        </p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-full rounded-[20px] bg-white dark:bg-[#111316] border border-[#e5e5e5] dark:border-white/[0.08] flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-sm">
          <div className="size-12 rounded-[14px] bg-[#f8f9fa] dark:bg-white/[0.06] border border-[#e5e7eb] dark:border-white/[0.08] flex items-center justify-center mx-auto text-[#3e4944] dark:text-zinc-400">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h3 className="font-['Funnel_Display',sans-serif] text-[22px] font-medium text-[#191c1d] dark:text-white">
            Project Not Found
          </h3>
          <p className="text-[14px] text-[#3e4944] dark:text-zinc-400">
            The project you are looking for may have been archived or deleted.
          </p>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-[13px] font-medium bg-[#191c1d] dark:bg-white text-white dark:text-[#191c1d] hover:opacity-90 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Portfolio</span>
          </Link>
        </div>
      </div>
    );
  }

  const teamRoster = project.teamMemberProfiles || [];
  const statusInfo =
    STATUS_BADGE_MAP[project.status] || STATUS_BADGE_MAP.ActiveSprint;
  const completedGoalsCount =
    project.goals?.filter((g) => g.completed).length || 0;
  const totalGoalsCount = project.goals?.length || 0;

  return (
    <div className="h-full rounded-[20px] bg-white dark:bg-[#111316] border border-[#e5e5e5] dark:border-white/[0.08] flex flex-col overflow-hidden">
      {/* Top Bar: Breadcrumb + Search + Share & Add Task (Figma 91:2549 & 93:3149) */}
      <div className="px-6 sm:px-9 pt-6 pb-0 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <nav className="flex items-center gap-1.5 text-[13px] text-[#3e4944] dark:text-zinc-400">
            <Link
              href="/projects"
              className="hover:text-[#191c1d] dark:hover:text-white transition-colors"
            >
              Projects
            </Link>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            <span className="font-medium text-[#191c1d] dark:text-zinc-100 truncate max-w-[240px]">
              {project.name}
            </span>
          </nav>

          <div className="flex flex-wrap items-center gap-2.5">
            {(activeTab === 'board' || activeTab === 'list') && (
              <div className="relative w-44 sm:w-56">
                <Search className="w-3.5 h-3.5 text-[#3e4944] dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full h-[36px] pl-8 pr-3 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#bdc9c2] dark:border-white/[0.12] text-[13px] text-[#191c1d] dark:text-white placeholder:text-[#3e4944]/60 focus:outline-none focus:border-[#006c52] dark:focus:border-[#79deba]"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsEditTeamModalOpen(true)}
              className="h-[36px] px-4 rounded-[8px] bg-[#66deb4] hover:bg-[#52d1a4] text-[#111316] text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAddTask()}
              className="h-[36px] px-4 rounded-[8px] bg-[#191c1d] dark:bg-white hover:opacity-90 text-white dark:text-[#191c1d] text-[13px] font-semibold inline-flex items-center gap-1.5 transition-opacity cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Project Title & Status Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="font-['Funnel_Display',sans-serif] font-medium text-[28px] sm:text-[34px] leading-[1.15] tracking-[-0.6px] text-[#191c1d] dark:text-white">
              {project.name}
            </h1>
            <div className="flex items-center flex-wrap gap-2.5 mt-2 text-[12.5px]">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[12px] text-[12px] font-medium',
                  statusInfo.pill
                )}
              >
                {project.status === 'ActiveSprint' ? (
                  <Zap className="w-3 h-3" />
                ) : (
                  <span
                    className={cn('size-2 rounded-full', statusInfo.dot)}
                  />
                )}
                {statusInfo.label}
              </span>

              <span className="text-[#3e4944] dark:text-zinc-400 inline-flex items-center gap-1">
                <span>•</span>
                {project.privacy === 'Private' ? (
                  <>
                    <Lock className="w-3 h-3" />
                    <span>Private to Team</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3 h-3" />
                    <span>Public Workspace</span>
                  </>
                )}
              </span>

              <span className="text-[#3e4944] dark:text-zinc-400 inline-flex items-center gap-1">
                <span>•</span>
                <span className="font-medium text-[#191c1d] dark:text-zinc-200">
                  {currentUserRole}
                </span>
              </span>
            </div>
          </div>

          {/* Compact Task Completion Indicator */}
          <div className="flex items-center gap-3 sm:min-w-[200px]">
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[#3e4944] dark:text-zinc-400">
                  Tasks Done
                </span>
                <span className="font-semibold text-[#191c1d] dark:text-white">
                  {progressMetrics.completed}/{progressMetrics.total} (
                  {progressMetrics.pct}%)
                </span>
              </div>
              <div className="h-[6px] w-full rounded-full bg-[#e1e3e4] dark:bg-white/[0.1] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#006c52] dark:bg-[#66deb4] transition-all duration-500"
                  style={{ width: `${progressMetrics.pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Figma Underline Tab Navigation */}
        <div className="flex items-center gap-6 border-b border-[#e5e7eb] dark:border-white/[0.08] overflow-x-auto scrollbar-none">
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'board', label: 'Board' },
              { id: 'list', label: 'List' },
              { id: 'conversation', label: 'Conversation' },
              { id: 'settings', label: 'Settings' },
            ] as { id: ProjectTab; label: string }[]
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative pb-3 text-[13.5px] whitespace-nowrap transition-colors inline-flex items-center gap-2 cursor-pointer',
                  isActive
                    ? 'text-[#006c52] dark:text-[#79deba] font-semibold'
                    : 'text-[#3e4944] dark:text-zinc-400 hover:text-[#191c1d] dark:hover:text-zinc-200 font-normal'
                )}
              >
                <span>{tab.label}</span>
                {tab.id === 'conversation' && channelUnread > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#66deb4] text-[#111316] font-bold text-[10px] leading-none">
                    {channelUnread}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#006c52] dark:bg-[#79deba] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab Content (scrolls inside the card; header & tabs remain pinned) */}
      <div
        className={cn(
          'flex-1 min-h-0 px-6 sm:px-9 py-6',
          activeTab === 'board' || activeTab === 'conversation'
            ? 'overflow-hidden flex flex-col'
            : 'overflow-y-auto'
        )}
      >
        {/* TAB 1: OVERVIEW (Figma 91:2549) */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left 2 Columns: Project Brief + Key Milestones */}
            <div className="lg:col-span-2 space-y-6">
              {/* Project Brief Card */}
              <div className="rounded-[12px] bg-white dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[#191c1d] dark:text-white">
                    <FileText className="w-5 h-5 text-[#006c52] dark:text-[#66deb4]" />
                    <h2 className="font-['Funnel_Display',sans-serif] font-medium text-[20px]">
                      Project Brief
                    </h2>
                  </div>
                  {canManageSettings && !isEditingBrief && (
                    <button
                      type="button"
                      onClick={() => {
                        setBriefDraft(project.description || '');
                        setIsEditingBrief(true);
                      }}
                      className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#006c52] dark:text-[#79deba] hover:underline cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Brief</span>
                    </button>
                  )}
                </div>

                {isEditingBrief ? (
                  <div className="space-y-3">
                    <textarea
                      rows={4}
                      autoFocus
                      value={briefDraft}
                      onChange={(e) => setBriefDraft(e.target.value)}
                      placeholder="Describe the project scope, objectives, and key deliverables..."
                      className="w-full p-3.5 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#79deba] text-[14px] leading-[22px] text-[#191c1d] dark:text-white focus:outline-none focus:border-[#006c52] resize-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingBrief(false)}
                        className="px-3 py-1.5 rounded-[6px] text-[12.5px] font-medium text-[#3e4944] dark:text-zinc-400 hover:bg-[#e7e8e9] dark:hover:bg-white/[0.06] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSavingBrief}
                        onClick={handleSaveBrief}
                        className="px-4 py-1.5 rounded-[6px] bg-[#006c52] dark:bg-[#66deb4] text-white dark:text-[#111316] text-[12.5px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {isSavingBrief && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        )}
                        <span>Save Brief</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[14.5px] leading-[24px] text-[#3e4944] dark:text-zinc-300 whitespace-pre-line">
                    {project.description ||
                      'No project brief has been added yet. Click Edit Brief to outline the project scope, objectives, and deliverables.'}
                  </p>
                )}

                <div className="pt-4 border-t border-[#e5e7eb] dark:border-white/[0.06] grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.5px] text-[#3e4944] dark:text-zinc-500">
                      Tasks Completed
                    </p>
                    <p className="font-['Funnel_Display',sans-serif] text-[20px] font-medium text-[#191c1d] dark:text-white mt-0.5">
                      {progressMetrics.completed} / {progressMetrics.total}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.5px] text-[#3e4944] dark:text-zinc-500">
                      Goals Reached
                    </p>
                    <p className="font-['Funnel_Display',sans-serif] text-[20px] font-medium text-[#191c1d] dark:text-white mt-0.5">
                      {completedGoalsCount} / {totalGoalsCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.5px] text-[#3e4944] dark:text-zinc-500">
                      Team Members
                    </p>
                    <p className="font-['Funnel_Display',sans-serif] text-[20px] font-medium text-[#191c1d] dark:text-white mt-0.5">
                      {teamRoster.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Key Milestones Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[#191c1d] dark:text-white">
                    <Flag className="w-5 h-5 text-[#006c52] dark:text-[#66deb4]" />
                    <h2 className="font-['Funnel_Display',sans-serif] font-medium text-[20px]">
                      Key Milestones
                    </h2>
                  </div>

                  {canManageSettings && (
                    <button
                      type="button"
                      onClick={() => setShowAddMilestone((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] hover:bg-[#eefaf5] dark:hover:bg-[#006c52]/20 border border-[#bdc9c2] dark:border-white/[0.12] text-[12.5px] font-medium text-[#191c1d] dark:text-zinc-200 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#006c52] dark:text-[#79deba]" />
                      <span>Add Milestone</span>
                    </button>
                  )}
                </div>

                {showAddMilestone && canManageSettings && (
                  <form
                    onSubmit={handleAddMilestone}
                    className="p-4 rounded-[12px] bg-[#f8f9fa] dark:bg-white/[0.03] border border-[#79deba] space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <input
                        type="text"
                        required
                        value={newMsTitle}
                        onChange={(e) => setNewMsTitle(e.target.value)}
                        placeholder="Milestone title..."
                        className="sm:col-span-2 h-[38px] px-3 rounded-[8px] bg-white dark:bg-[#15171b] border border-[#bdc9c2] dark:border-white/[0.12] text-[13px] text-[#191c1d] dark:text-white focus:outline-none focus:border-[#006c52]"
                      />
                      <input
                        type="date"
                        value={newMsDate}
                        onChange={(e) => setNewMsDate(e.target.value)}
                        className="h-[38px] px-3 rounded-[8px] bg-white dark:bg-[#15171b] border border-[#bdc9c2] dark:border-white/[0.12] text-[13px] text-[#191c1d] dark:text-white focus:outline-none focus:border-[#006c52]"
                      />
                    </div>
                    <input
                      type="text"
                      value={newMsDesc}
                      onChange={(e) => setNewMsDesc(e.target.value)}
                      placeholder="Short deliverable description (optional)..."
                      className="w-full h-[38px] px-3 rounded-[8px] bg-white dark:bg-[#15171b] border border-[#bdc9c2] dark:border-white/[0.12] text-[13px] text-[#191c1d] dark:text-white focus:outline-none focus:border-[#006c52]"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddMilestone(false)}
                        className="px-3 py-1.5 rounded-[6px] text-[12px] text-[#3e4944] dark:text-zinc-400 hover:bg-[#e7e8e9] dark:hover:bg-white/[0.06] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!newMsTitle.trim()}
                        className="px-4 py-1.5 rounded-[6px] bg-[#006c52] dark:bg-[#66deb4] text-white dark:text-[#111316] text-[12px] font-semibold disabled:opacity-40 cursor-pointer"
                      >
                        Save Milestone
                      </button>
                    </div>
                  </form>
                )}

                {project.milestones && project.milestones.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {project.milestones.map((ms, idx) => {
                      const isCompleted = ms.status === 'Completed';
                      const isInProgress = ms.status === 'InProgress';
                      const isEditingThis = editingMsIdx === idx;

                      if (isEditingThis && canManageSettings) {
                        return (
                          <form
                            key={idx}
                            onSubmit={handleSaveMilestone}
                            className="p-4 rounded-[12px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#79deba] space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#006c52] dark:text-[#79deba]">
                                Edit Milestone
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingMsIdx(null)}
                                className="p-1 rounded text-[#3e4944] dark:text-zinc-400 hover:bg-[#e7e8e9] dark:hover:bg-white/[0.08] cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <input
                              type="text"
                              required
                              autoFocus
                              value={editMsTitle}
                              onChange={(e) => setEditMsTitle(e.target.value)}
                              placeholder="Milestone title"
                              className="w-full h-[36px] px-3 rounded-[8px] bg-white dark:bg-[#15171b] border border-[#bdc9c2] dark:border-white/[0.12] text-[13px] text-[#191c1d] dark:text-white focus:outline-none focus:border-[#006c52]"
                            />

                            <textarea
                              rows={2}
                              value={editMsDesc}
                              onChange={(e) => setEditMsDesc(e.target.value)}
                              placeholder="Short description (optional)"
                              className="w-full p-2.5 rounded-[8px] bg-white dark:bg-[#15171b] border border-[#bdc9c2] dark:border-white/[0.12] text-[12.5px] text-[#191c1d] dark:text-white focus:outline-none focus:border-[#006c52] resize-none"
                            />

                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={editMsStatus}
                                onChange={(e) => {
                                  const next = e.target.value as MilestoneStatus;
                                  setEditMsStatus(next);
                                  if (next === 'Completed') setEditMsProgress(100);
                                  else if (next === 'Upcoming') setEditMsProgress(0);
                                  else if (editMsProgress === 0 || editMsProgress === 100)
                                    setEditMsProgress(50);
                                }}
                                className="h-[36px] px-2.5 rounded-[8px] bg-white dark:bg-[#15171b] border border-[#bdc9c2] dark:border-white/[0.12] text-[12.5px] text-[#191c1d] dark:text-white focus:outline-none focus:border-[#006c52]"
                              >
                                <option value="Upcoming" className="bg-white dark:bg-[#17191d]">Upcoming</option>
                                <option value="InProgress" className="bg-white dark:bg-[#17191d]">In Progress</option>
                                <option value="Completed" className="bg-white dark:bg-[#17191d]">Completed</option>
                              </select>

                              <input
                                type="date"
                                value={editMsDate}
                                onChange={(e) => setEditMsDate(e.target.value)}
                                className="h-[36px] px-2.5 rounded-[8px] bg-white dark:bg-[#15171b] border border-[#bdc9c2] dark:border-white/[0.12] text-[12.5px] text-[#191c1d] dark:text-white focus:outline-none focus:border-[#006c52]"
                              />
                            </div>

                            {editMsStatus === 'InProgress' && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11.5px] text-[#3e4944] dark:text-zinc-400">
                                  <span>Progress</span>
                                  <span className="font-semibold text-[#191c1d] dark:text-white">
                                    {editMsProgress}%
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  step={5}
                                  value={editMsProgress}
                                  onChange={(e) =>
                                    setEditMsProgress(Number(e.target.value))
                                  }
                                  className="w-full accent-[#006c52] dark:accent-[#66deb4] cursor-pointer"
                                />
                              </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingMsIdx(null)}
                                className="px-3 py-1.5 rounded-[6px] text-[12px] text-[#3e4944] dark:text-zinc-400 hover:bg-[#e7e8e9] dark:hover:bg-white/[0.06] cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={!editMsTitle.trim()}
                                className="px-3.5 py-1.5 rounded-[6px] bg-[#006c52] dark:bg-[#66deb4] text-white dark:text-[#111316] text-[12px] font-semibold disabled:opacity-40 cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          </form>
                        );
                      }

                      return (
                        <div
                          key={idx}
                          className={cn(
                            'group p-5 rounded-[12px] bg-white dark:bg-[#15171b] border flex flex-col justify-between gap-4 transition-all',
                            isCompleted
                              ? 'border-[#79deba]'
                              : 'border-[#e5e7eb] dark:border-white/[0.08]'
                          )}
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                disabled={!canManageSettings}
                                onClick={() => handleCycleMilestoneStatus(idx)}
                                title={
                                  canManageSettings
                                    ? 'Click to advance milestone status'
                                    : undefined
                                }
                                className={cn(
                                  'px-2.5 py-0.5 rounded-[6px] text-[10.5px] font-semibold uppercase tracking-[0.5px] transition-opacity',
                                  canManageSettings &&
                                    'cursor-pointer hover:opacity-80',
                                  isCompleted
                                    ? 'bg-[#e7e8e9] dark:bg-white/[0.08] text-[#3e4944] dark:text-zinc-300'
                                    : isInProgress
                                      ? 'bg-[#ddec6b] dark:bg-[#F0FF7C]/15 text-[#5a6400] dark:text-[#F0FF7C]'
                                      : 'bg-[#e7e8e9] dark:bg-white/[0.08] text-[#3e4944] dark:text-zinc-400'
                                )}
                              >
                                {isInProgress ? 'IN PROGRESS' : ms.status}
                              </button>

                              <div className="flex items-center gap-1">
                                {isCompleted ? (
                                  <CheckCircle2 className="w-4 h-4 text-[#006c52] dark:text-[#66deb4]" />
                                ) : isInProgress ? (
                                  <RefreshCw className="w-4 h-4 text-[#006c52] dark:text-[#66deb4]" />
                                ) : (
                                  <Rocket className="w-4 h-4 text-[#3e4944] dark:text-zinc-400" />
                                )}
                                {canManageSettings && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => startEditMilestone(idx)}
                                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#3e4944] dark:text-zinc-400 hover:text-[#006c52] dark:hover:text-[#66deb4] transition-all cursor-pointer"
                                      title="Edit milestone"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMilestone(idx)}
                                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#3e4944] dark:text-zinc-400 hover:text-[#ba1a1a] dark:hover:text-rose-400 transition-all cursor-pointer"
                                      title="Delete milestone"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            <div>
                              <h3 className="font-['Funnel_Display',sans-serif] font-medium text-[17px] text-[#191c1d] dark:text-white">
                                {ms.title}
                              </h3>
                              {ms.description && (
                                <p className="text-[13px] text-[#3e4944] dark:text-zinc-400 mt-1 line-clamp-2">
                                  {ms.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2.5">
                            {isInProgress && (
                              <div className="h-[5px] w-full rounded-full bg-[#e1e3e4] dark:bg-white/[0.1] overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[#66deb4]"
                                  style={{ width: `${ms.progress}%` }}
                                />
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[12px] text-[#3e4944] dark:text-zinc-400">
                              {isInProgress ? (
                                <span className="font-medium text-[#191c1d] dark:text-zinc-200">
                                  {ms.progress}% Complete
                                </span>
                              ) : (
                                <span />
                              )}
                              {ms.date && (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {new Date(ms.date).toLocaleDateString(
                                    'en-US',
                                    {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    }
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 rounded-[12px] border border-dashed border-[#bdc9c2] dark:border-white/[0.12] text-center space-y-1.5">
                    <p className="text-[14px] font-medium text-[#191c1d] dark:text-zinc-200">
                      No milestones defined yet
                    </p>
                    <p className="text-[12.5px] text-[#3e4944] dark:text-zinc-400">
                      Track major phases and delivery dates for this project.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: High-Level Goals + Project Team + Access & Invite */}
            <div className="space-y-5">
              {/* HIGH-LEVEL GOALS Card (Figma 91:2549) */}
              <div className="rounded-[12px] bg-white dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#3e4944] dark:text-zinc-400">
                    High-Level Goals
                  </h3>
                  <span className="text-[11.5px] font-medium text-[#006c52] dark:text-[#79deba]">
                    {completedGoalsCount}/{totalGoalsCount}
                  </span>
                </div>

                <div className="space-y-3">
                  {project.goals && project.goals.length > 0 ? (
                    project.goals.map((goal, idx) => {
                      if (editingGoalIdx === idx && canManageSettings) {
                        return (
                          <form
                            key={idx}
                            onSubmit={handleSaveGoal}
                            className="p-3 rounded-[10px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#79deba] space-y-2"
                          >
                            <input
                              type="text"
                              required
                              autoFocus
                              value={editGoalTitle}
                              onChange={(e) => setEditGoalTitle(e.target.value)}
                              placeholder="Goal title"
                              className="w-full h-[34px] px-2.5 rounded-[6px] bg-white dark:bg-[#15171b] border border-[#bdc9c2] dark:border-white/[0.12] text-[13px] text-[#191c1d] dark:text-white focus:outline-none focus:border-[#006c52]"
                            />
                            <input
                              type="text"
                              value={editGoalDesc}
                              onChange={(e) => setEditGoalDesc(e.target.value)}
                              placeholder="Short note / target (optional)"
                              className="w-full h-[32px] px-2.5 rounded-[6px] bg-white dark:bg-[#15171b] border border-[#bdc9c2] dark:border-white/[0.12] text-[12px] text-[#191c1d] dark:text-white focus:outline-none focus:border-[#006c52]"
                            />
                            <div className="flex items-center justify-end gap-1.5 pt-0.5">
                              <button
                                type="button"
                                onClick={() => setEditingGoalIdx(null)}
                                className="px-2.5 py-1 rounded-[6px] text-[11.5px] text-[#3e4944] dark:text-zinc-400 hover:bg-[#e7e8e9] dark:hover:bg-white/[0.06] cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={!editGoalTitle.trim()}
                                className="px-3 py-1 rounded-[6px] bg-[#006c52] dark:bg-[#66deb4] text-white dark:text-[#111316] text-[11.5px] font-semibold disabled:opacity-40 cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          </form>
                        );
                      }

                      return (
                        <div
                          key={idx}
                          onClick={() =>
                            canManageSettings && handleToggleGoal(idx)
                          }
                          className={cn(
                            'group flex items-start gap-3 p-2 -mx-2 rounded-[10px] transition-colors',
                            canManageSettings &&
                              'cursor-pointer hover:bg-[#f8f9fa] dark:hover:bg-white/[0.04]'
                          )}
                        >
                          <div
                            className={cn(
                              'size-8 rounded-[8px] flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                              goal.completed
                                ? 'bg-[#66deb4] text-[#111316]'
                                : 'bg-[#e6f7f1] dark:bg-[#006c52]/25 text-[#006c52] dark:text-[#79deba]'
                            )}
                          >
                            {goal.completed ? (
                              <Check className="w-4 h-4 stroke-[2.5]" />
                            ) : (
                              <Target className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                'text-[13.5px] font-medium leading-[19px]',
                                goal.completed
                                  ? 'line-through text-[#3e4944]/60 dark:text-zinc-500'
                                  : 'text-[#191c1d] dark:text-zinc-100'
                              )}
                            >
                              {goal.title}
                            </p>
                            {goal.description && (
                              <p className="text-[12px] text-[#3e4944] dark:text-zinc-400 mt-0.5 line-clamp-2">
                                {goal.description}
                              </p>
                            )}
                          </div>
                          {canManageSettings && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditGoal(idx);
                                }}
                                className="p-1 rounded text-[#3e4944] dark:text-zinc-400 hover:text-[#006c52] dark:hover:text-[#79deba] transition-colors cursor-pointer"
                                title="Edit goal"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteGoal(idx);
                                }}
                                className="p-1 rounded text-[#3e4944] dark:text-zinc-400 hover:text-[#ba1a1a] transition-colors cursor-pointer"
                                title="Delete goal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-[13px] text-[#3e4944] dark:text-zinc-500 py-2">
                      No strategic goals added yet.
                    </p>
                  )}

                  {canManageSettings && (
                    <form
                      onSubmit={handleAddGoal}
                      className="flex gap-2 pt-2 border-t border-[#e5e7eb] dark:border-white/[0.06]"
                    >
                      <input
                        type="text"
                        value={newGoalTitle}
                        onChange={(e) => setNewGoalTitle(e.target.value)}
                        placeholder="Add a strategic goal..."
                        className="flex-1 h-[36px] px-3 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#bdc9c2] dark:border-white/[0.12] text-[12.5px] text-[#191c1d] dark:text-white placeholder:text-[#3e4944]/60 focus:outline-none focus:border-[#006c52]"
                      />
                      <button
                        type="submit"
                        disabled={!newGoalTitle.trim()}
                        className="h-[36px] px-3 rounded-[8px] bg-[#006c52] dark:bg-[#66deb4] text-white dark:text-[#111316] text-[12px] font-semibold disabled:opacity-40 cursor-pointer"
                      >
                        Add
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* PROJECT TEAM Card (Figma 91:2549) */}
              <div className="rounded-[12px] bg-white dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#3e4944] dark:text-zinc-400">
                    Project Team
                  </h3>
                  <span className="text-[12px] text-[#3e4944] dark:text-zinc-400">
                    {teamRoster.length}{' '}
                    {teamRoster.length === 1 ? 'Member' : 'Members'}
                  </span>
                </div>

                {/* Avatar Strip + Quick Invite '+' Button */}
                <div className="flex items-center gap-2 flex-wrap">
                  {teamRoster.slice(0, 5).map((m) => (
                    <div
                      key={m.userId}
                      title={`${m.name || 'Member'} (${m.projectRole || 'Member'})`}
                      className="size-9 rounded-full bg-[#e7e8e9] dark:bg-zinc-800 border-2 border-white dark:border-[#15171b] flex items-center justify-center text-[11px] font-semibold text-[#191c1d] dark:text-zinc-100 overflow-hidden shrink-0"
                    >
                      {m.imageUrl ? (
                        <img
                          src={m.imageUrl}
                          alt={m.name || 'Member'}
                          className="size-full object-cover"
                        />
                      ) : (
                        (m.name || 'U').slice(0, 2).toUpperCase()
                      )}
                    </div>
                  ))}
                  {canManageSettings && (
                    <button
                      type="button"
                      onClick={() => setIsEditTeamModalOpen(true)}
                      title={
                        isAdmin ? 'Manage & Invite Members' : 'Invite Members'
                      }
                      className="size-9 rounded-full bg-[#e7e8e9] dark:bg-white/[0.08] hover:bg-[#66deb4] text-[#191c1d] dark:text-zinc-200 hover:text-[#111316] flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Compact Roster List with 1-Click DM */}
                <div className="space-y-1.5 pt-2 border-t border-[#e5e7eb] dark:border-white/[0.06] max-h-56 overflow-y-auto scrollbar-thin">
                  {teamRoster.map((m) => (
                    <div
                      key={m.userId}
                      className="flex items-center justify-between gap-2 py-1.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-medium text-[#191c1d] dark:text-zinc-100 truncate">
                            {m.name || 'Project Member'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-[#f3f4f6] dark:bg-white/[0.06] text-[10px] font-medium text-[#3e4944] dark:text-zinc-400 shrink-0">
                            {m.projectRole || 'Member'}
                          </span>
                        </div>
                      </div>
                      {m.userId !== userId && (
                        <Link
                          href={`/chats?dm=${m.userId}&name=${encodeURIComponent(
                            m.name || m.email || ''
                          )}&avatar=${encodeURIComponent(m.imageUrl || '')}`}
                          title={`Message ${m.name || 'member'}`}
                          className="p-1.5 rounded-[6px] text-[#3e4944] dark:text-zinc-400 hover:text-[#006c52] dark:hover:text-[#79deba] hover:bg-[#eefaf5] dark:hover:bg-[#006c52]/20 transition-colors shrink-0"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ACCESS & JOIN CODE Card */}
              <div className="rounded-[12px] bg-white dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] p-5 space-y-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#3e4944] dark:text-zinc-400">
                  Workspace Access
                </h3>

                {project.privacy === 'Private' ? (
                  <div className="p-3 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.03] border border-[#e5e7eb] dark:border-white/[0.08] text-[12.5px] text-[#3e4944] dark:text-zinc-400 flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-[#006c52] dark:text-[#79deba] shrink-0 mt-0.5" />
                    <span>
                      Private project. Join codes are disabled — Admins &amp; Moderators can invite people directly via Share.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between p-3 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#e5e7eb] dark:border-white/[0.08]">
                      <div>
                        <p className="text-[10.5px] uppercase tracking-[0.5px] text-[#3e4944] dark:text-zinc-500">
                          Join Code
                        </p>
                        <p className="font-mono text-[15px] font-bold tracking-[0.2em] text-[#191c1d] dark:text-white">
                          {project.joinCode}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyJoinCode}
                        className="px-2.5 py-1.5 rounded-[6px] bg-white dark:bg-white/[0.08] border border-[#bdc9c2] dark:border-white/[0.12] text-[12px] font-medium text-[#191c1d] dark:text-zinc-100 inline-flex items-center gap-1 hover:border-[#006c52] transition-colors cursor-pointer"
                      >
                        {copiedCode ? (
                          <Check className="w-3.5 h-3.5 text-[#006c52] dark:text-[#79deba]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyInviteLink}
                      className="w-full py-2 px-3 rounded-[8px] border border-[#bdc9c2] dark:border-white/[0.12] hover:border-[#006c52] text-[12.5px] font-medium text-[#191c1d] dark:text-zinc-200 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedLink ? (
                        <Check className="w-3.5 h-3.5 text-[#006c52] dark:text-[#79deba]" />
                      ) : (
                        <Link2 className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {copiedLink ? 'Invite Link Copied!' : 'Copy Invite Link'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KANBAN BOARD (Figma 93:3149) */}
        {activeTab === 'board' && (
          <ProjectKanbanBoard
            columns={boardColumns}
            tasks={filteredTasks}
            onColumnsChange={handleColumnsChange}
            onRenameColumn={handleRenameColumn}
            onMoveTask={moveTask}
            onEditTask={handleOpenEditTask}
            onSelectTask={handleOpenTaskDetail}
            onDeleteTask={deleteTask}
            onAddTaskToColumn={handleOpenAddTask}
            members={teamRoster}
            canManageTask={(t) => canManageSettings || t.createdBy === userId}
          />
        )}

        {/* TAB 3: LIST VIEW (Grouped by Board Columns) */}
        {activeTab === 'list' && (
          <ProjectTaskTable
            columns={boardColumns}
            tasks={filteredTasks}
            onEditTask={handleOpenEditTask}
            onSelectTask={handleOpenTaskDetail}
            onDeleteTask={deleteTask}
            onAddTaskToColumn={handleOpenAddTask}
            members={teamRoster}
            canManageTask={(t) => canManageSettings || t.createdBy === userId}
          />
        )}

        {/* TAB 4: CONVERSATION (Figma 80:875) */}
        {activeTab === 'conversation' && (
          <ProjectConversationTab
            projectId={String(project._id)}
            projectName={project.name}
            canModerate={canManageSettings}
            members={teamRoster}
          />
        )}

        {/* TAB 5: SETTINGS (Reorganized 2-Column Layout) */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left 2 Columns: General Project Settings */}
            <div className="lg:col-span-2 rounded-[12px] bg-white dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] p-6 space-y-5">
              <div>
                <h2 className="font-['Funnel_Display',sans-serif] font-medium text-[20px] text-[#191c1d] dark:text-white flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-[#006c52] dark:text-[#66deb4]" />
                  <span>General Settings</span>
                </h2>
                <p className="text-[13px] text-[#3e4944] dark:text-zinc-400 mt-0.5">
                  Update project details, delivery status, and workspace visibility.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                {settingsSuccess && (
                  <div className="p-3 rounded-[8px] bg-[#e6f7f1] dark:bg-emerald-500/15 border border-[#79deba] text-[#006c52] dark:text-emerald-300 text-[13px] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Project settings updated successfully!</span>
                  </div>
                )}

                {settingsError && (
                  <div className="p-3 rounded-[8px] bg-[#ffdad6] dark:bg-rose-500/15 border border-[#ba1a1a]/30 text-[#93000a] dark:text-rose-300 text-[13px]">
                    {settingsError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-[#191c1d] dark:text-zinc-200">
                    Project Name
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!canManageSettings}
                    value={settingsName}
                    onChange={(e) => setSettingsName(e.target.value)}
                    className="w-full h-[42px] px-3.5 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#bdc9c2] dark:border-white/[0.12] text-[14px] text-[#191c1d] dark:text-white focus:outline-none focus:border-[#006c52] disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-[#191c1d] dark:text-zinc-200">
                    Project Brief / Description
                  </label>
                  <textarea
                    rows={4}
                    disabled={!canManageSettings}
                    value={settingsDesc}
                    onChange={(e) => setSettingsDesc(e.target.value)}
                    className="w-full p-3.5 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#bdc9c2] dark:border-white/[0.12] text-[14px] text-[#191c1d] dark:text-white focus:outline-none focus:border-[#006c52] resize-none disabled:opacity-60"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#191c1d] dark:text-zinc-200">
                      Status
                    </label>
                    <select
                      value={settingsStatus}
                      disabled={!canManageSettings}
                      onChange={(e) =>
                        setSettingsStatus(e.target.value as ProjectStatus)
                      }
                      className="w-full h-[42px] px-3 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#bdc9c2] dark:border-white/[0.12] text-[14px] text-[#191c1d] dark:text-white focus:outline-none focus:border-[#006c52] disabled:opacity-60"
                    >
                      <option value="ActiveSprint" className="bg-white dark:bg-[#17191d]">Active Sprint</option>
                      <option value="OnTrack" className="bg-white dark:bg-[#17191d]">On Track</option>
                      <option value="AtRisk" className="bg-white dark:bg-[#17191d]">At Risk</option>
                      <option value="Completed" className="bg-white dark:bg-[#17191d]">Completed</option>
                      <option value="Archived" className="bg-white dark:bg-[#17191d]">Archived</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#191c1d] dark:text-zinc-200">
                      Visibility
                    </label>
                    <select
                      value={settingsPrivacy}
                      disabled={!canManageSettings}
                      onChange={(e) =>
                        setSettingsPrivacy(e.target.value as ProjectPrivacy)
                      }
                      className="w-full h-[42px] px-3 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#bdc9c2] dark:border-white/[0.12] text-[14px] text-[#191c1d] dark:text-white focus:outline-none focus:border-[#006c52] disabled:opacity-60"
                    >
                      <option value="Public" className="bg-white dark:bg-[#17191d]">Public (Join via Code)</option>
                      <option value="Private" className="bg-white dark:bg-[#17191d]">Private (Invite Only)</option>
                    </select>
                  </div>
                </div>

                {canManageSettings && (
                  <div className="flex justify-end pt-3 border-t border-[#e5e7eb] dark:border-white/[0.06]">
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="px-5 py-2.5 rounded-[8px] text-[13px] font-semibold bg-[#006c52] hover:bg-[#005742] dark:bg-[#66deb4] dark:hover:bg-[#52d1a4] text-white dark:text-[#111316] inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSavingSettings && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Right Column: Team, Join Code, Leave & Danger Zone */}
            <div className="space-y-5">
              {canManageSettings && (
                <div className="rounded-[12px] bg-white dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] p-5 space-y-3">
                  <h3 className="font-['Funnel_Display',sans-serif] font-medium text-[17px] text-[#191c1d] dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#006c52] dark:text-[#66deb4]" />
                    <span>Members &amp; Roles</span>
                  </h3>
                  <p className="text-[12.5px] text-[#3e4944] dark:text-zinc-400">
                    Add collaborators by email, quick-add teammates, or update roles.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsEditTeamModalOpen(true)}
                    className="w-full py-2.5 px-4 rounded-[8px] bg-[#66deb4] hover:bg-[#52d1a4] text-[#111316] text-[13px] font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isAdmin ? 'Manage Members' : 'Invite Members'}</span>
                  </button>
                </div>
              )}

              {isAdmin && (
                <div className="rounded-[12px] bg-white dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] p-5 space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-['Funnel_Display',sans-serif] font-medium text-[17px] text-[#191c1d] dark:text-white flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-[#006c52] dark:text-[#66deb4]" />
                      <span>Join Code</span>
                    </h3>
                    <button
                      type="button"
                      onClick={handleResetJoinCode}
                      disabled={isResettingCode}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-[#f8f9fa] dark:bg-white/[0.06] border border-[#bdc9c2] dark:border-white/[0.12] text-[11.5px] font-medium text-[#191c1d] dark:text-zinc-200 hover:border-[#006c52] dark:hover:border-[#66deb4] transition-colors cursor-pointer"
                    >
                      <RefreshCw
                        className={cn(
                          'w-3 h-3',
                          isResettingCode && 'animate-spin'
                        )}
                      />
                      <span>Reset</span>
                    </button>
                  </div>

                  <p className="text-[12.5px] text-[#3e4944] dark:text-zinc-400">
                    {project.privacy === 'Private'
                      ? 'Private project — join codes are disabled until switched to Public.'
                      : 'Share this 6-character code or link so teammates can join.'}
                  </p>

                  <div className="p-3 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#e5e7eb] dark:border-white/[0.08] flex items-center justify-between gap-2">
                    <span className="font-mono text-[16px] font-bold tracking-[0.2em] text-[#191c1d] dark:text-white">
                      {project.joinCode}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopyJoinCode}
                        className="p-1.5 rounded-[6px] bg-white dark:bg-white/[0.08] border border-[#bdc9c2] dark:border-white/[0.12] text-[#191c1d] dark:text-zinc-200 cursor-pointer"
                        title="Copy Code"
                      >
                        {copiedCode ? (
                          <Check className="w-3.5 h-3.5 text-[#006c52] dark:text-[#66deb4]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyInviteLink}
                        disabled={project.privacy === 'Private'}
                        className="p-1.5 rounded-[6px] bg-white dark:bg-white/[0.08] border border-[#bdc9c2] dark:border-white/[0.12] text-[#191c1d] dark:text-zinc-200 disabled:opacity-40 cursor-pointer"
                        title="Copy Invite Link"
                      >
                        {copiedLink ? (
                          <Check className="w-3.5 h-3.5 text-[#006c52] dark:text-[#66deb4]" />
                        ) : (
                          <Link2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {(!isAdmin ||
                teamRoster.filter(
                  (m) => (m.projectRole || 'Member') === 'Admin'
                ).length > 1) && (
                <div className="rounded-[12px] bg-[#fff8eb] dark:bg-amber-500/10 border border-amber-300/70 dark:border-amber-500/25 p-5 space-y-2.5">
                  <h4 className="text-[12px] font-semibold uppercase tracking-[0.6px] text-amber-800 dark:text-amber-400">
                    Leave Project
                  </h4>
                  <p className="text-[12.5px] text-[#3e4944] dark:text-zinc-400">
                    Remove yourself from this workspace and its project channel.
                  </p>
                  <button
                    type="button"
                    onClick={handleLeaveProject}
                    disabled={isLeaving}
                    className="px-4 py-2 rounded-[8px] text-[12.5px] font-semibold bg-amber-500 hover:bg-amber-600 text-white inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{isLeaving ? 'Leaving...' : 'Leave Project'}</span>
                  </button>
                </div>
              )}

              {isAdmin && (
                <div className="rounded-[12px] bg-[#ffdad6]/40 dark:bg-rose-500/10 border border-[#ba1a1a]/30 p-5 space-y-2.5">
                  <h4 className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#93000a] dark:text-rose-400">
                    Danger Zone
                  </h4>
                  <p className="text-[12.5px] text-[#3e4944] dark:text-zinc-400">
                    Permanently delete this project and all of its associated tasks.
                  </p>
                  <button
                    type="button"
                    onClick={handleDeleteProject}
                    disabled={isDeleting}
                    className="px-4 py-2 rounded-[8px] text-[12.5px] font-semibold bg-[#ba1a1a] hover:bg-[#93000a] text-white inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeleting ? 'Deleting...' : 'Delete Project'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals — conditionally mounted for zero idle overhead */}
      {isDetailModalOpen && (
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
          onTaskUpdated={(updated) => {
            setSelectedDetailTask(updated);
            setTasks((prev) =>
              prev.map((t) => (t._id === updated._id ? updated : t))
            );
          }}
          onTaskDeleted={(deletedId) => {
            setSelectedDetailTask(null);
            setTasks((prev) => prev.filter((t) => t._id !== deletedId));
          }}
        />
      )}

      {isTaskModalOpen && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          onSave={handleSaveTask}
          task={editingTask}
          defaultStatus="To Do"
          defaultColumn={defaultTaskColumn}
          columns={boardColumns}
          projectId={project._id}
          members={teamRoster}
        />
      )}

      {isEditTeamModalOpen && (
        <EditTeamModal
          isOpen={isEditTeamModalOpen}
          onClose={() => setIsEditTeamModalOpen(false)}
          projectId={project._id}
          projectName={project.name}
          isAdmin={isAdmin}
          canInvite={canManageSettings}
          teamMemberProfiles={teamRoster}
          onTeamUpdated={() => {
            loadProject(true);
          }}
        />
      )}
    </div>
  );
}
