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
  Loader2,
  KeyRound,
} from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useUser } from '@clerk/nextjs';
import { CreateProjectModal } from '@/components/project/CreateProjectModal';
import { JoinProjectModal } from '@/components/project/JoinProjectModal';
import { ProjectStatus } from '@synca/types';
import { cn } from '@/lib/utils';

export default function ProjectsPage() {
  const { user } = useUser();
  const { projects, isLoading } = useProjects();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

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
            <Sparkles className="w-3.5 h-3.5" />
            <span>Projects Portfolio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white mt-1">
            Projects & Workspaces
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Manage your project goals, join codes, board workflows, and task progress
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-all border border-zinc-200 dark:border-white/[0.08]"
          >
            <KeyRound className="w-4 h-4 text-lime-500" />
            <span>Join with Code</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-lime-400 to-emerald-500 text-zinc-950 text-xs font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.04] dark:backdrop-blur-md border border-zinc-200 dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            <FolderKanban className="w-4 h-4 text-lime-500" />
            <span>Total Projects</span>
          </div>
          <p className="text-xl font-black text-zinc-900 dark:text-white mt-2">{metrics.total}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.04] dark:backdrop-blur-md border border-zinc-200 dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            <Clock className="w-4 h-4 text-lime-400" />
            <span>Active Sprint</span>
          </div>
          <p className="text-xl font-black text-zinc-900 dark:text-white mt-2">{metrics.active}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.04] dark:backdrop-blur-md border border-zinc-200 dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>On Track</span>
          </div>
          <p className="text-xl font-black text-zinc-900 dark:text-white mt-2">{metrics.onTrack}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.04] dark:backdrop-blur-md border border-zinc-200 dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <span>At Risk</span>
          </div>
          <p className="text-xl font-black text-zinc-900 dark:text-white mt-2">{metrics.atRisk}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.04] dark:backdrop-blur-md border border-zinc-200 dark:border-white/[0.08] shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Completed</span>
          </div>
          <p className="text-xl font-black text-zinc-900 dark:text-white mt-2">{metrics.completed}</p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-lime-500/50"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {['All', 'ActiveSprint', 'OnTrack', 'AtRisk', 'Completed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
                statusFilter === st
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                  : 'bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/[0.08]'
              )}
            >
              {st === 'All' ? 'All Status' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-lime-500" />
          <p className="text-xs font-medium">Loading project portfolio...</p>
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((proj) => {
            const badge = getStatusBadge(proj.status);
            const totalGoals = proj.goals?.length || 0;
            const completedGoals = proj.goals?.filter((g) => g.completed).length || 0;
            const goalProgress = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

            return (
              <Link
                key={proj._id}
                href={`/projects/${proj._id}`}
                className="group relative flex flex-col justify-between p-5 rounded-3xl bg-white dark:bg-white/[0.04] dark:backdrop-blur-xl border border-zinc-200 dark:border-white/[0.08] hover:border-lime-500/50 shadow-sm hover:shadow-xl transition-all duration-300"
              >
                <div>
                  {/* Top Card Row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-lime-400/20 to-emerald-500/20 border border-lime-500/30 flex items-center justify-center text-lime-600 dark:text-lime-400 font-extrabold text-sm shrink-0">
                        {proj.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-lime-500 transition-colors line-clamp-1">
                          {proj.name}
                        </h3>
                        <p className="text-[11px] text-zinc-400 font-mono">Code: {proj.joinCode}</p>
                      </div>
                    </div>

                    <span
                      className={cn(
                        'px-2.5 py-1 rounded-xl text-[10px] font-bold border flex items-center gap-1.5 shrink-0',
                        badge.classes
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', badge.dot)} />
                      {badge.label}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 min-h-[2.5rem] mb-4">
                    {proj.description || 'No description provided for this project.'}
                  </p>

                  {/* Goals Progress Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                      <span>Goal Progress</span>
                      <span>{goalProgress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-white/[0.08] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-lime-400 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${goalProgress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-3 border-t border-zinc-100 dark:border-white/[0.08] flex items-center justify-between text-xs text-zinc-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(proj.createdAt).toLocaleDateString()}</span>
                  </div>

                  <span className="flex items-center gap-1 text-lime-600 dark:text-lime-400 font-bold group-hover:translate-x-1 transition-transform">
                    <span>View Project</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 p-8 rounded-3xl bg-white dark:bg-white/[0.02] border border-dashed border-zinc-300 dark:border-white/[0.1] space-y-4">
          <FolderKanban className="w-12 h-12 text-zinc-400 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">No Projects Found</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {search || statusFilter !== 'All'
                ? 'Try adjusting your search query or status filter.'
                : 'Get started by creating your first project or joining one with a code.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-zinc-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200"
            >
              Join Project with Code
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-lime-400 text-zinc-950 shadow-md"
            >
              Create Project
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
      <JoinProjectModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
      />
    </div>
  );
}
