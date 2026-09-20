'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useUser } from '@clerk/nextjs';
import { CreateProjectModal } from '@/components/project/CreateProjectModal';
import { ProjectStatus } from '@synca/types';
import { cn } from '@/lib/utils';

export default function ProjectsPage() {
  const { user } = useUser();
  const { activeWorkspace } = useWorkspace();
  const { projects, isLoading, refreshProjects } = useProjects();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Status Metrics
  const metrics = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === 'ActiveSprint').length;
    const onTrack = projects.filter((p) => p.status === 'OnTrack').length;
    const atRisk = projects.filter((p) => p.status === 'AtRisk').length;
    const completed = projects.filter((p) => p.status === 'Completed').length;
    return { total, active, onTrack, atRisk, completed };
  }, [projects]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesStatus =
        statusFilter === 'All' ? true : p.status === statusFilter;
      const matchesSearch =
        !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
      return matchesStatus && matchesSearch;
    });
  }, [projects, statusFilter, search]);

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'OnTrack':
        return {
          label: 'On Track',
          classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          dot: 'bg-emerald-500',
        };
      case 'ActiveSprint':
        return {
          label: 'Active Sprint',
          classes: 'bg-[#d8f870]/15 text-zinc-900 dark:text-[#d8f870] border-[#d8f870]/30',
          dot: 'bg-[#d8f870]',
        };
      case 'AtRisk':
        return {
          label: 'At Risk',
          classes: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
          dot: 'bg-rose-500',
        };
      case 'Completed':
        return {
          label: 'Completed',
          classes: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
          dot: 'bg-indigo-500',
        };
      case 'Archived':
      default:
        return {
          label: status,
          classes: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
          dot: 'bg-zinc-400',
        };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#2ecc8f] uppercase tracking-wider">
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Workspace Initiatives</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight mt-1">
            Project Portfolio
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Manage, collaborate, and track active deliverables in{' '}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {activeWorkspace?.name || 'your workspace'}
            </span>
            .
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#d8f870] hover:bg-[#c4ea48] text-zinc-950 text-xs font-bold shadow-md shadow-[#d8f870]/10 transition-all active:scale-[0.98] shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Projects', value: metrics.total, icon: Layers, color: 'text-zinc-700 dark:text-zinc-300' },
          { label: 'Active Sprint', value: metrics.active, icon: Sparkles, color: 'text-[#2ecc8f]' },
          { label: 'On Track', value: metrics.onTrack, icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'At Risk', value: metrics.atRisk, icon: AlertCircle, color: 'text-rose-500' },
          { label: 'Completed', value: metrics.completed, icon: Clock, color: 'text-indigo-400' },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl border border-zinc-200/80 dark:border-white/[0.08] shadow-sm flex items-center gap-3 transition-colors"
            >
              <div className={cn('p-2 rounded-xl bg-zinc-100 dark:bg-white/[0.05]', item.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{item.label}</p>
                <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">{item.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl border border-zinc-200/80 dark:border-white/[0.08] shadow-sm transition-colors">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects by title or scope..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700/80 text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#8be6c1] focus:border-[#8be6c1]"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
          {['All', 'ActiveSprint', 'OnTrack', 'AtRisk', 'Completed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
                statusFilter === tab
                  ? 'bg-zinc-900 dark:bg-[#1f242e] text-white dark:text-[#d8f870] border border-transparent dark:border-[#d8f870]/30 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
              )}
            >
              {tab === 'All'
                ? 'All Statuses'
                : tab === 'ActiveSprint'
                ? 'Active Sprint'
                : tab === 'OnTrack'
                ? 'On Track'
                : tab === 'AtRisk'
                ? 'At Risk'
                : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
          <Loader2 className="w-8 h-8 text-[#d8f870] animate-spin" />
          <p className="text-xs text-zinc-500 font-medium">Loading workspace projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl rounded-3xl p-10 border border-dashed border-zinc-300 dark:border-zinc-800 text-center space-y-4 max-w-md mx-auto my-8">
          <div className="w-14 h-14 rounded-2xl bg-[#d8f870]/15 text-[#d8f870] flex items-center justify-center mx-auto shadow-sm">
            <FolderKanban className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {search || statusFilter !== 'All' ? 'No matching projects found' : 'No projects created yet'}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {search || statusFilter !== 'All'
                ? 'Try resetting your search query or status filter.'
                : 'Get started by creating your first project workspace with Kanban boards and milestones.'}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#d8f870] text-zinc-950 hover:bg-[#c4ea48] transition-all shadow-md shadow-[#d8f870]/10"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProjects.map((proj) => {
            const badge = getStatusBadge(proj.status);
            const goalsCount = proj.goals?.length || 0;
            const completedGoals = proj.goals?.filter((g) => g.completed)?.length || 0;
            const progressPct =
              goalsCount > 0 ? Math.round((completedGoals / goalsCount) * 100) : 0;

            return (
              <Link
                key={proj._id}
                href={`/projects/${proj._id}`}
                className="bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl rounded-3xl p-5 border border-zinc-200/80 dark:border-white/[0.08] shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-white/[0.18] transition-all flex flex-col justify-between space-y-4 group cursor-pointer relative overflow-hidden"
              >
                {/* Top ambient highlight on hover */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#d8f870]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="space-y-3">
                  {/* Status & Options */}
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1.5',
                        badge.classes
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', badge.dot)} />
                      <span>{badge.label}</span>
                    </span>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono capitalize">
                      {proj.privacy}
                    </span>
                  </div>

                  {/* Title & Desc */}
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-[#2ecc8f] transition-colors line-clamp-1">
                      {proj.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                      {proj.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                {/* Progress & Goals */}
                <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-white/[0.06]">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {goalsCount > 0
                          ? `Goals (${completedGoals}/${goalsCount})`
                          : 'Progress'}
                      </span>
                      <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                        {progressPct}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#2ecc8f] to-[#d8f870] rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Members & Date */}
                  <div className="flex items-center justify-between pt-1 text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {proj.teamMembers && proj.teamMembers.length > 0 ? (
                        proj.teamMembers.slice(0, 4).map((uid, idx) => {
                          const isCurrentUser = uid === user?.id;
                          const mem = activeWorkspace?.members?.find((m) => m.userId === uid);
                          const avatarUrl = isCurrentUser ? (user?.imageUrl || mem?.imageUrl) : mem?.imageUrl;
                          const name = isCurrentUser
                            ? (user?.fullName || mem?.name || 'You')
                            : (mem?.name || mem?.email || 'Member');
                          const initials = name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2);

                          return avatarUrl ? (
                            <img
                              key={idx}
                              src={avatarUrl}
                              alt={name}
                              title={name}
                              className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-zinc-900 object-cover shrink-0"
                            />
                          ) : (
                            <div
                              key={idx}
                              title={name}
                              className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-zinc-900 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center justify-center shrink-0"
                            >
                              {initials}
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-[11px] text-zinc-400">Team</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[11px]">
                        {new Date(proj.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {/* New Project CTA Card */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white/60 dark:bg-white/[0.02] dark:backdrop-blur-md hover:bg-white dark:hover:bg-white/[0.05] rounded-3xl p-6 border-2 border-dashed border-zinc-300 dark:border-white/[0.1] hover:border-[#2ecc8f] dark:hover:border-[#2ecc8f] flex flex-col items-center justify-center text-center space-y-3 min-h-[220px] transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-[#d8f870] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">New Project</h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Launch an initiative in this workspace
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => refreshProjects()}
      />
    </div>
  );
}
