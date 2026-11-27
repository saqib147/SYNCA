'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Calendar,
  Clock,
  AlertTriangle,
  MoreHorizontal,
  ChevronDown,
  KeyRound,
  Loader2,
  Zap,
  Copy,
  Link2,
  ExternalLink,
  Check,
  FolderKanban,
} from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useTeammates } from '@/hooks/useTeammates';
import { useUser } from '@clerk/nextjs';
import { CreateProjectModal } from '@/components/project/CreateProjectModal';
import { JoinProjectModal } from '@/components/project/JoinProjectModal';
import { Project, ProjectStatus } from '@synca/types';
import { cn } from '@/lib/utils';

interface ResolvedMember {
  userId: string;
  name: string;
  avatarUrl?: string;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'All', label: 'All Statuses' },
  { value: 'OnTrack', label: 'On Track' },
  { value: 'ActiveSprint', label: 'Active Sprint' },
  { value: 'AtRisk', label: 'At Risk' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Archived', label: 'Archived' },
];

const PRIVACY_OPTIONS: { value: string; label: string }[] = [
  { value: 'All', label: 'Privacy: Any' },
  { value: 'Public', label: 'Public' },
  { value: 'Private', label: 'Private' },
];

function formatShortDate(dateInput: Date | string) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ProjectsPage() {
  const { user } = useUser();
  const { projects, isLoading } = useProjects();
  const { teammates } = useTeammates();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [privacyFilter, setPrivacyFilter] = useState<string>('All');
  const [memberFilter, setMemberFilter] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  // Close card action menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  // Build quick lookup map for member avatars/names (teammates + current Clerk user)
  const memberDirectory = useMemo(() => {
    const map = new Map<string, ResolvedMember>();
    if (user?.id) {
      map.set(user.id, {
        userId: user.id,
        name: user.fullName || user.firstName || user.username || 'You',
        avatarUrl: user.imageUrl,
      });
    }
    teammates.forEach((tm) => {
      map.set(tm.userId, {
        userId: tm.userId,
        name: tm.name,
        avatarUrl: tm.avatarUrl,
      });
    });
    return map;
  }, [user, teammates]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesStatus =
        statusFilter === 'All' ? true : p.status === statusFilter;
      const matchesPrivacy =
        privacyFilter === 'All' ? true : p.privacy === privacyFilter;

      const memberIds =
        p.members && p.members.length > 0
          ? p.members.map((m) => m.userId)
          : p.teamMembers || [];
      const matchesMember =
        memberFilter === 'All'
          ? true
          : memberFilter === 'Owned'
            ? p.ownerId === user?.id
            : memberIds.includes(memberFilter);

      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.joinCode && p.joinCode.toLowerCase().includes(q));

      return matchesStatus && matchesPrivacy && matchesMember && matchesSearch;
    });
  }, [projects, statusFilter, privacyFilter, memberFilter, search, user?.id]);

  const resolveProjectMembers = (proj: Project): ResolvedMember[] => {
    const rawIds =
      proj.members && proj.members.length > 0
        ? proj.members.map((m) => m.userId)
        : proj.teamMembers || [];
    const uniqueIds = Array.from(new Set(rawIds));
    return uniqueIds.map((uid) => {
      const known = memberDirectory.get(uid);
      if (known) return known;
      return {
        userId: uid,
        name: 'Member',
      };
    });
  };

  const handleCopy = (
    e: React.MouseEvent,
    text: string,
    key: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard?.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId((prev) => (prev === key ? null : prev)), 1800);
  };

  const renderStatusPill = (status: ProjectStatus) => {
    switch (status) {
      case 'OnTrack':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-[12px] bg-[#ddec6b] dark:bg-[#F0FF7C]/15 px-3 py-1 text-[12px] font-normal tracking-[0.6px] text-[#606a00] dark:text-[#F0FF7C]">
            <span className="size-[8px] rounded-full bg-[#5a6400] dark:bg-[#F0FF7C]" />
            On Track
          </span>
        );
      case 'ActiveSprint':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-[12px] border border-[#bdc9c2] dark:border-white/[0.14] bg-[#e7e8e9] dark:bg-white/[0.08] px-3 py-1 text-[12px] font-normal tracking-[0.6px] text-[#191c1d] dark:text-zinc-200">
            <Zap className="size-3 text-[#191c1d] dark:text-[#79deba]" />
            Active Sprint
          </span>
        );
      case 'AtRisk':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-[12px] bg-[#ffdad6] dark:bg-rose-500/15 px-3 py-1 text-[12px] font-normal tracking-[0.6px] text-[#93000a] dark:text-rose-300">
            <span className="size-[8px] rounded-full bg-[#ba1a1a] dark:bg-rose-400" />
            At Risk
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-[12px] bg-[#d3f5e8] dark:bg-emerald-500/15 px-3 py-1 text-[12px] font-normal tracking-[0.6px] text-[#006c52] dark:text-emerald-300">
            <span className="size-[8px] rounded-full bg-[#006c52] dark:bg-emerald-400" />
            Completed
          </span>
        );
      case 'Archived':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-[12px] bg-[#e7e8e9] dark:bg-white/[0.08] px-3 py-1 text-[12px] font-normal tracking-[0.6px] text-[#3e4944] dark:text-zinc-400">
            <span className="size-[8px] rounded-full bg-[#6b7280]" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="h-full rounded-[20px] bg-white dark:bg-[#111316] border border-[#e5e5e5] dark:border-white/[0.08] px-6 py-7 sm:px-9 sm:py-8 lg:px-11 flex flex-col overflow-hidden">
      {/* Page Header & Filters */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5 mb-7 shrink-0">
        <div className="space-y-1">
          <h1 className="font-['Funnel_Display',sans-serif] font-medium text-[34px] sm:text-[42px] leading-[1.15] tracking-[-0.96px] text-[#191c1d] dark:text-white">
            Project Portfolio
          </h1>
          <p className="text-[15px] sm:text-[16px] leading-[24px] text-[#3e4944] dark:text-zinc-400">
            Manage and track your active initiatives.
          </p>
        </div>

        {/* Right Controls — Figma bordered #f8f9fa dropdowns + Search + Join with Code */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Search Input */}
          <div className="relative flex-1 sm:flex-none sm:w-[210px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#3e4944] dark:text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[46px] pl-10 pr-3.5 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#bdc9c2] dark:border-white/[0.12] text-[14px] text-[#191c1d] dark:text-white placeholder:text-[#3e4944]/70 dark:placeholder:text-zinc-500 focus:outline-none focus:border-[#006c52] dark:focus:border-[#79deba] transition-colors"
            />
          </div>

          {/* All Statuses Dropdown */}
          <div className="relative">
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none h-[46px] pl-4 pr-10 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#bdc9c2] dark:border-white/[0.12] text-[14px] text-[#191c1d] dark:text-zinc-100 focus:outline-none focus:border-[#006c52] dark:focus:border-[#79deba] cursor-pointer transition-colors"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-white dark:bg-[#17191d] text-[#191c1d] dark:text-white"
                >
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#3e4944] dark:text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Privacy Dropdown */}
          <div className="relative">
            <select
              aria-label="Filter by privacy"
              value={privacyFilter}
              onChange={(e) => setPrivacyFilter(e.target.value)}
              className="appearance-none h-[46px] pl-4 pr-10 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#bdc9c2] dark:border-white/[0.12] text-[14px] text-[#191c1d] dark:text-zinc-100 focus:outline-none focus:border-[#006c52] dark:focus:border-[#79deba] cursor-pointer transition-colors"
            >
              {PRIVACY_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-white dark:bg-[#17191d] text-[#191c1d] dark:text-white"
                >
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#3e4944] dark:text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Member / Assignee Dropdown */}
          <div className="relative">
            <select
              aria-label="Filter by member"
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              className="appearance-none h-[46px] pl-4 pr-10 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#bdc9c2] dark:border-white/[0.12] text-[14px] text-[#191c1d] dark:text-zinc-100 focus:outline-none focus:border-[#006c52] dark:focus:border-[#79deba] cursor-pointer transition-colors max-w-[175px]"
            >
              <option
                value="All"
                className="bg-white dark:bg-[#17191d] text-[#191c1d] dark:text-white"
              >
                Member: All
              </option>
              <option
                value="Owned"
                className="bg-white dark:bg-[#17191d] text-[#191c1d] dark:text-white"
              >
                Owned by me
              </option>
              {teammates.map((tm) => (
                <option
                  key={tm.userId}
                  value={tm.userId}
                  className="bg-white dark:bg-[#17191d] text-[#191c1d] dark:text-white"
                >
                  {tm.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#3e4944] dark:text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Join with Code Action */}
          <button
            type="button"
            onClick={() => setShowJoinModal(true)}
            className="h-[46px] px-4 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] hover:bg-[#eef1f2] dark:hover:bg-white/[0.08] border border-[#bdc9c2] dark:border-white/[0.12] text-[14px] font-medium text-[#191c1d] dark:text-zinc-100 inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-[#006c52] dark:text-[#79deba]" />
            <span>Join Code</span>
          </button>
        </div>
      </div>

      {/* Bento Grid Project Cards (scrolls internally) */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 text-[#3e4944] dark:text-zinc-400 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#006c52] dark:text-[#79deba]" />
          <p className="text-[14px]">Loading project portfolio...</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-2">
          {filteredProjects.length === 0 && (search || statusFilter !== 'All' || privacyFilter !== 'All' || memberFilter !== 'All') ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-[8px] border border-dashed border-[#bdc9c2] dark:border-white/[0.14] bg-[#f8f9fa]/60 dark:bg-white/[0.02] mb-6">
              <FolderKanban className="w-10 h-10 text-[#3e4944]/60 dark:text-zinc-500 mb-3" />
              <h3 className="font-['Funnel_Display',sans-serif] text-[20px] font-medium text-[#191c1d] dark:text-white">
                No matching projects
              </h3>
              <p className="text-[14px] text-[#3e4944] dark:text-zinc-400 mt-1 max-w-md">
                Try adjusting your search or filter criteria, or create a new project below.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('All');
                  setPrivacyFilter('All');
                  setMemberFilter('All');
                }}
                className="mt-4 px-4 py-2 rounded-[8px] bg-[#191c1d] dark:bg-white text-white dark:text-[#191c1d] text-[13px] font-medium hover:opacity-90 transition-opacity cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredProjects.map((proj) => {
              const totalGoals = proj.goals?.length || 0;
              const completedGoals =
                proj.goals?.filter((g) => g.completed).length || 0;
              const goalProgress =
                totalGoals > 0
                  ? Math.round((completedGoals / totalGoals) * 100)
                  : proj.status === 'Completed'
                    ? 100
                    : 0;

              const isAtRisk = proj.status === 'AtRisk';
              const isActiveSprint = proj.status === 'ActiveSprint';
              const members = resolveProjectMembers(proj);
              const visibleMembers = members.slice(0, 3);
              const extraCount = Math.max(0, members.length - 3);
              const isMenuOpen = openMenuId === proj._id;

              return (
                <div
                  key={proj._id}
                  className={cn(
                    'group relative flex flex-col justify-between rounded-[8px] bg-white dark:bg-[#17191d] transition-all duration-200 min-h-[336px]',
                    isActiveSprint
                      ? 'border border-[#79deba] border-t-4 px-[25px] pt-[24px] pb-[25px] hover:shadow-[0_6px_24px_-8px_rgba(0,108,82,0.18)]'
                      : 'border border-[#bdc9c2] dark:border-white/[0.1] p-[25px] hover:border-[#006c52] dark:hover:border-[#79deba]/60 hover:shadow-[0_6px_24px_-8px_rgba(25,28,29,0.12)]'
                  )}
                >
                  {/* Full-card Link overlay (keeps menu button interactive above it) */}
                  <Link
                    href={`/projects/${proj._id}`}
                    aria-label={`Open project ${proj.name}`}
                    className="absolute inset-0 z-0 rounded-[8px]"
                  />

                  <div className="relative z-10 pointer-events-none flex flex-col flex-1">
                    {/* Top Row: Status Pill + More Button */}
                    <div className="flex items-start justify-between gap-2 pb-6">
                      {renderStatusPill(proj.status)}

                      <div
                        className="relative pointer-events-auto"
                        ref={isMenuOpen ? menuContainerRef : undefined}
                      >
                        <button
                          type="button"
                          aria-label="Project actions"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenMenuId(isMenuOpen ? null : proj._id);
                          }}
                          className="p-1 -mr-1 rounded-md text-[#3e4944] dark:text-zinc-400 hover:bg-[#f3f3f3] dark:hover:bg-white/[0.08] hover:text-[#191c1d] dark:hover:text-white transition-colors cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {isMenuOpen && (
                          <div className="absolute right-0 top-7 z-30 w-44 rounded-[10px] bg-white dark:bg-[#1e2127] border border-[#bdc9c2] dark:border-white/[0.12] shadow-lg py-1.5 text-[13px]">
                            <Link
                              href={`/projects/${proj._id}`}
                              onClick={() => setOpenMenuId(null)}
                              className="flex items-center gap-2 px-3 py-2 text-[#191c1d] dark:text-zinc-100 hover:bg-[#f8f9fa] dark:hover:bg-white/[0.06]"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-[#3e4944] dark:text-zinc-400" />
                              <span>Open Project</span>
                            </Link>
                            {proj.joinCode && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleCopy(
                                      e,
                                      proj.joinCode,
                                      `code-${proj._id}`
                                    )
                                  }
                                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-[#191c1d] dark:text-zinc-100 hover:bg-[#f8f9fa] dark:hover:bg-white/[0.06] cursor-pointer"
                                >
                                  {copiedId === `code-${proj._id}` ? (
                                    <Check className="w-3.5 h-3.5 text-[#006c52] dark:text-[#79deba]" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5 text-[#3e4944] dark:text-zinc-400" />
                                  )}
                                  <span>
                                    {copiedId === `code-${proj._id}`
                                      ? 'Copied Code!'
                                      : `Code: ${proj.joinCode}`}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleCopy(
                                      e,
                                      `${window.location.origin}/projects/join?code=${proj.joinCode}`,
                                      `link-${proj._id}`
                                    )
                                  }
                                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-[#191c1d] dark:text-zinc-100 hover:bg-[#f8f9fa] dark:hover:bg-white/[0.06] cursor-pointer"
                                >
                                  {copiedId === `link-${proj._id}` ? (
                                    <Check className="w-3.5 h-3.5 text-[#006c52] dark:text-[#79deba]" />
                                  ) : (
                                    <Link2 className="w-3.5 h-3.5 text-[#3e4944] dark:text-zinc-400" />
                                  )}
                                  <span>
                                    {copiedId === `link-${proj._id}`
                                      ? 'Link Copied!'
                                      : 'Copy Invite Link'}
                                  </span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Project Title */}
                    <h3 className="font-['Funnel_Display',sans-serif] font-medium text-[22px] sm:text-[24px] leading-[30px] text-[#191c1d] dark:text-white line-clamp-2 pb-1.5 group-hover:text-[#006c52] dark:group-hover:text-[#79deba] transition-colors">
                      {proj.name}
                    </h3>

                    {/* Description */}
                    <p className="text-[14px] leading-[20px] text-[#3e4944] dark:text-zinc-400 line-clamp-2 min-h-[40px] mb-6">
                      {proj.description ||
                        'No description provided for this project yet.'}
                    </p>

                    {/* Progress Section */}
                    <div className="mt-auto pb-6">
                      {isActiveSprint ? (
                        <div className="rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#bdc9c2] dark:border-white/[0.1] p-[13px] space-y-2">
                          <div className="flex items-center justify-between gap-2 text-[12px] tracking-[0.4px]">
                            <span className="text-[#3e4944] dark:text-zinc-400">
                              Sprint Goals
                            </span>
                            <span className="text-[#006c52] dark:text-[#79deba] font-medium whitespace-nowrap">
                              {totalGoals > 0
                                ? `${completedGoals}/${totalGoals} Completed`
                                : 'No goals yet'}
                            </span>
                          </div>
                          <div className="h-[4px] w-full rounded-[12px] bg-[#e1e3e4] dark:bg-white/[0.1] overflow-hidden">
                            <div
                              className="h-full rounded-[12px] bg-[#79deba] transition-all duration-500"
                              style={{ width: `${goalProgress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[14px] leading-[20px]">
                            {isAtRisk ? (
                              <span className="inline-flex items-center gap-1.5 text-[#ba1a1a] dark:text-rose-400">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Blocked</span>
                              </span>
                            ) : (
                              <span className="text-[#3e4944] dark:text-zinc-400">
                                Progress
                              </span>
                            )}
                            <span className="text-[#191c1d] dark:text-white font-medium">
                              {goalProgress}%
                            </span>
                          </div>
                          <div className="h-[8px] w-full rounded-[12px] bg-[#e1e3e4] dark:bg-white/[0.1] overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-[12px] transition-all duration-500',
                                isAtRisk
                                  ? 'bg-[#ba1a1a] dark:bg-rose-500'
                                  : 'bg-[#006c52] dark:bg-[#66deb4]'
                              )}
                              style={{ width: `${goalProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Overlapping Avatars + Date */}
                  <div className="relative z-10 pointer-events-none border-t border-[#bdc9c2] dark:border-white/[0.1] pt-5 flex items-center justify-between gap-2">
                    <div className="flex items-center">
                      {visibleMembers.length > 0 ? (
                        <div className="flex items-center -space-x-2">
                          {visibleMembers.map((member, idx) => (
                            <div
                              key={member.userId}
                              title={member.name}
                              style={{ zIndex: 10 - idx }}
                              className="size-[32px] rounded-[12px] border-2 border-white dark:border-[#17191d] bg-[#e7e8e9] dark:bg-zinc-800 overflow-hidden flex items-center justify-center text-[11px] font-semibold text-[#3e4944] dark:text-zinc-200 shrink-0"
                            >
                              {member.avatarUrl ? (
                                <img
                                  src={member.avatarUrl}
                                  alt={member.name}
                                  className="size-full object-cover"
                                />
                              ) : (
                                <span>
                                  {member.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                          ))}
                          {extraCount > 0 && (
                            <div className="size-[32px] rounded-[12px] border-2 border-white dark:border-[#17191d] bg-[#e7e8e9] dark:bg-white/[0.1] flex items-center justify-center text-[12px] tracking-[0.4px] text-[#3e4944] dark:text-zinc-300 shrink-0 z-0">
                              +{extraCount}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[12px] text-[#3e4944] dark:text-zinc-500">
                          Solo
                        </span>
                      )}
                    </div>

                    <div
                      className={cn(
                        'inline-flex items-center gap-1.5 text-[14px] leading-[20px] whitespace-nowrap',
                        isAtRisk
                          ? 'text-[#ba1a1a] dark:text-rose-400'
                          : 'text-[#3e4944] dark:text-zinc-400'
                      )}
                    >
                      {isActiveSprint ? (
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{formatShortDate(proj.updatedAt || proj.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Final Card: New Project (Figma node 91:1864) */}
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="group flex flex-col items-center justify-between rounded-[8px] bg-white dark:bg-[#17191d] border border-[#bdc9c2] dark:border-white/[0.12] border-t-4 min-h-[336px] px-6 pt-20 pb-8 hover:border-[#006c52] dark:hover:border-[#79deba] hover:bg-[#f8f9fa]/70 dark:hover:bg-white/[0.03] transition-all cursor-pointer"
            >
              <div className="flex-1 flex items-center justify-center">
                <div className="size-[92px] rounded-full border border-[#006c52]/70 dark:border-[#79deba]/70 flex items-center justify-center group-hover:scale-105 group-hover:border-[#006c52] dark:group-hover:border-[#79deba] transition-all">
                  <Plus className="w-10 h-10 text-[#006c52] dark:text-[#79deba] stroke-[1.5]" />
                </div>
              </div>
              <span className="font-['Funnel_Display',sans-serif] font-normal text-[13px] leading-[32px] text-[#191c1d] dark:text-zinc-200 mt-4">
                New Project
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Modals — conditionally mounted so closed modals never fire background hooks */}
      {showCreateModal && (
        <CreateProjectModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}
      {showJoinModal && (
        <JoinProjectModal
          isOpen={showJoinModal}
          onClose={() => setShowJoinModal(false)}
        />
      )}
    </div>
  );
}
