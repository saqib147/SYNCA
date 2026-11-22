'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  X,
  FolderKanban,
  Lock,
  Globe,
  Loader2,
  KeyRound,
  Plus,
  Trash2,
  Target,
  Flag,
  ArrowRight,
  ArrowLeft,
  Check,
  Zap,
} from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { createProjectSchema } from '@synca/zod-schemas';
import { ProjectStatus, ProjectPrivacy } from '@synca/types';
import { cn } from '@/lib/utils';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (projectId: string) => void;
}

interface DraftGoal {
  title: string;
  description?: string;
}

const STATUS_CHOICES: {
  value: ProjectStatus;
  label: string;
  activeClass: string;
  dotClass: string;
}[] = [
  {
    value: 'ActiveSprint',
    label: 'Active Sprint',
    activeClass:
      'bg-[#e7e8e9] dark:bg-white/[0.12] border-[#006c52] dark:border-[#79deba] text-[#191c1d] dark:text-white',
    dotClass: 'bg-[#006c52] dark:bg-[#79deba]',
  },
  {
    value: 'OnTrack',
    label: 'On Track',
    activeClass:
      'bg-[#ddec6b] border-[#5a6400] text-[#606a00]',
    dotClass: 'bg-[#5a6400]',
  },
  {
    value: 'AtRisk',
    label: 'At Risk',
    activeClass:
      'bg-[#ffdad6] dark:bg-rose-500/20 border-[#ba1a1a] text-[#93000a] dark:text-rose-200',
    dotClass: 'bg-[#ba1a1a]',
  },
];

export function CreateProjectModal({
  isOpen,
  onClose,
  onCreated,
}: CreateProjectModalProps) {
  const { createProject } = useProjects();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('ActiveSprint');
  const [privacy, setPrivacy] = useState<ProjectPrivacy>('Public');

  // Step 2: Optional starter goals & first milestone
  const [goals, setGoals] = useState<DraftGoal[]>([]);
  const [goalInput, setGoalInput] = useState('');
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDate, setMilestoneDate] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const resetForm = () => {
    setStep(1);
    setName('');
    setDescription('');
    setStatus('ActiveSprint');
    setPrivacy('Public');
    setGoals([]);
    setGoalInput('');
    setMilestoneTitle('');
    setMilestoneDate('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAddGoal = () => {
    const trimmed = goalInput.trim();
    if (!trimmed) return;
    setGoals((prev) => [...prev, { title: trimmed }]);
    setGoalInput('');
  };

  const handleRemoveGoal = (idx: number) => {
    setGoals((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleNextStep = () => {
    if (name.trim().length < 2) {
      setError('Project name must be at least 2 characters');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const pendingGoals = goalInput.trim()
      ? [...goals, { title: goalInput.trim() }]
      : goals;

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      status,
      privacy,
      goals: pendingGoals.map((g) => ({
        title: g.title,
        description: g.description,
        completed: false,
      })),
      milestones: milestoneTitle.trim()
        ? [
            {
              title: milestoneTitle.trim(),
              status: 'Upcoming' as const,
              progress: 0,
              date: milestoneDate || undefined,
            },
          ]
        : [],
    };

    const validation = createProjectSchema.safeParse(payload);
    if (!validation.success) {
      const firstError =
        validation.error.errors[0]?.message || 'Invalid project data';
      setError(firstError);
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await createProject(payload);
      resetForm();
      onClose();

      if (onCreated) {
        onCreated(created._id);
      } else {
        router.push(`/projects/${created._id}`);
      }
    } catch (err: any) {
      console.error('[CreateProjectModal] Submission error:', err);
      setError(err.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      onClick={handleClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        className="relative w-full max-w-[560px] bg-white dark:bg-[#14171c] rounded-[20px] border border-[#bdc9c2] dark:border-white/[0.1] shadow-2xl overflow-hidden text-[#191c1d] dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 pt-6 pb-5 border-b border-[#e5e7eb] dark:border-white/[0.08] flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="size-10 rounded-[12px] bg-[#e6f7f1] dark:bg-[#006c52]/25 border border-[#79deba]/60 dark:border-[#79deba]/30 flex items-center justify-center text-[#006c52] dark:text-[#79deba] shrink-0">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Funnel_Display',sans-serif] font-medium text-[22px] leading-[28px] text-[#191c1d] dark:text-white">
                Create New Project
              </h2>
              <p className="text-[13px] text-[#3e4944] dark:text-zinc-400 mt-0.5">
                {step === 1
                  ? 'Define your workspace essentials and team access.'
                  : 'Optionally add starter goals and your first milestone.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="p-1.5 rounded-[8px] text-[#3e4944] dark:text-zinc-400 hover:text-[#191c1d] dark:hover:text-white hover:bg-[#f3f3f3] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-7 py-3 bg-[#f8f9fa] dark:bg-white/[0.02] border-b border-[#e5e7eb] dark:border-white/[0.06] flex items-center gap-3 text-[12px]">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={cn(
              'flex items-center gap-2 font-medium transition-colors cursor-pointer',
              step === 1
                ? 'text-[#006c52] dark:text-[#79deba]'
                : 'text-[#3e4944] dark:text-zinc-400'
            )}
          >
            <span
              className={cn(
                'size-5 rounded-full flex items-center justify-center text-[11px] font-semibold',
                step === 1
                  ? 'bg-[#006c52] text-white'
                  : 'bg-[#79deba] text-[#191c1d]'
              )}
            >
              {step > 1 ? <Check className="w-3 h-3" /> : '1'}
            </span>
            <span>Essentials</span>
          </button>

          <div className="h-[1px] flex-1 bg-[#bdc9c2] dark:bg-white/[0.1]" />

          <button
            type="button"
            onClick={handleNextStep}
            className={cn(
              'flex items-center gap-2 font-medium transition-colors cursor-pointer',
              step === 2
                ? 'text-[#006c52] dark:text-[#79deba]'
                : 'text-[#3e4944] dark:text-zinc-500'
            )}
          >
            <span
              className={cn(
                'size-5 rounded-full flex items-center justify-center text-[11px] font-semibold',
                step === 2
                  ? 'bg-[#006c52] text-white'
                  : 'bg-[#e7e8e9] dark:bg-white/[0.08] text-[#3e4944] dark:text-zinc-400'
              )}
            >
              2
            </span>
            <span>Goals &amp; Milestone (Optional)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5">
          {error && (
            <div className="p-3 rounded-[10px] bg-[#ffdad6] dark:bg-rose-500/15 border border-[#ba1a1a]/30 text-[#93000a] dark:text-rose-300 text-[13px]">
              {error}
            </div>
          )}

          {step === 1 ? (
            <>
              {/* Project Name */}
              <div>
                <label className="block text-[13px] font-medium text-[#191c1d] dark:text-zinc-200 mb-1.5">
                  Project Name <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. Cloud Migration Phase II, Synca AI Engine"
                  className="w-full h-[44px] px-3.5 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#bdc9c2] dark:border-white/[0.12] text-[14px] text-[#191c1d] dark:text-white placeholder:text-[#3e4944]/60 dark:placeholder:text-zinc-500 focus:outline-none focus:border-[#006c52] dark:focus:border-[#79deba] transition-colors"
                />
              </div>

              {/* Project Brief */}
              <div>
                <label className="block text-[13px] font-medium text-[#191c1d] dark:text-zinc-200 mb-1.5">
                  Project Brief
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize the scope, objectives, or key deliverables for your team..."
                  className="w-full p-3.5 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#bdc9c2] dark:border-white/[0.12] text-[14px] text-[#191c1d] dark:text-white placeholder:text-[#3e4944]/60 dark:placeholder:text-zinc-500 focus:outline-none focus:border-[#006c52] dark:focus:border-[#79deba] transition-colors resize-none"
                />
              </div>

              {/* Initial Status Pills */}
              <div>
                <label className="block text-[13px] font-medium text-[#191c1d] dark:text-zinc-200 mb-2">
                  Initial Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_CHOICES.map((opt) => {
                    const selected = status === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setStatus(opt.value)}
                        className={cn(
                          'inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] border text-[13px] font-medium transition-all cursor-pointer',
                          selected
                            ? opt.activeClass
                            : 'bg-[#f8f9fa] dark:bg-white/[0.03] border-[#bdc9c2] dark:border-white/[0.1] text-[#3e4944] dark:text-zinc-400 hover:border-[#006c52]/50'
                        )}
                      >
                        {opt.value === 'ActiveSprint' ? (
                          <Zap className="w-3.5 h-3.5" />
                        ) : (
                          <span
                            className={cn(
                              'size-2 rounded-full',
                              selected ? opt.dotClass : 'bg-zinc-400'
                            )}
                          />
                        )}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visibility Visual Cards */}
              <div>
                <label className="block text-[13px] font-medium text-[#191c1d] dark:text-zinc-200 mb-2">
                  Workspace Access
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPrivacy('Public')}
                    className={cn(
                      'text-left p-3.5 rounded-[10px] border transition-all cursor-pointer',
                      privacy === 'Public'
                        ? 'bg-[#e6f7f1]/60 dark:bg-[#006c52]/15 border-[#006c52] dark:border-[#79deba]'
                        : 'bg-[#f8f9fa] dark:bg-white/[0.03] border-[#bdc9c2] dark:border-white/[0.1] hover:border-[#006c52]/50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#191c1d] dark:text-white">
                        <Globe className="w-4 h-4 text-[#006c52] dark:text-[#79deba]" />
                        Public
                      </span>
                      {privacy === 'Public' && (
                        <Check className="w-4 h-4 text-[#006c52] dark:text-[#79deba]" />
                      )}
                    </div>
                    <p className="text-[12px] text-[#3e4944] dark:text-zinc-400 leading-[17px]">
                      Teammates can join via the 6-char Join Code or Invite Link.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrivacy('Private')}
                    className={cn(
                      'text-left p-3.5 rounded-[10px] border transition-all cursor-pointer',
                      privacy === 'Private'
                        ? 'bg-[#e6f7f1]/60 dark:bg-[#006c52]/15 border-[#006c52] dark:border-[#79deba]'
                        : 'bg-[#f8f9fa] dark:bg-white/[0.03] border-[#bdc9c2] dark:border-white/[0.1] hover:border-[#006c52]/50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#191c1d] dark:text-white">
                        <Lock className="w-4 h-4 text-[#006c52] dark:text-[#79deba]" />
                        Private
                      </span>
                      {privacy === 'Private' && (
                        <Check className="w-4 h-4 text-[#006c52] dark:text-[#79deba]" />
                      )}
                    </div>
                    <p className="text-[12px] text-[#3e4944] dark:text-zinc-400 leading-[17px]">
                      Invite-only. Join codes are disabled; add members directly.
                    </p>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Starter High-Level Goals */}
              <div>
                <label className="flex items-center gap-1.5 text-[13px] font-medium text-[#191c1d] dark:text-zinc-200 mb-1.5">
                  <Target className="w-4 h-4 text-[#006c52] dark:text-[#79deba]" />
                  <span>High-Level Goals</span>
                </label>
                <p className="text-[12px] text-[#3e4944] dark:text-zinc-400 mb-2.5">
                  Add key targets to track progress on your Portfolio card and Overview tab.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddGoal();
                      }
                    }}
                    placeholder="e.g. Achieve 99.9% uptime, Launch beta..."
                    className="flex-1 h-[40px] px-3.5 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#bdc9c2] dark:border-white/[0.12] text-[13px] text-[#191c1d] dark:text-white placeholder:text-[#3e4944]/60 focus:outline-none focus:border-[#006c52] dark:focus:border-[#79deba]"
                  />
                  <button
                    type="button"
                    onClick={handleAddGoal}
                    disabled={!goalInput.trim()}
                    className="h-[40px] px-3.5 rounded-[8px] bg-[#e6f7f1] dark:bg-[#006c52]/25 hover:bg-[#d3f2e7] text-[#006c52] dark:text-[#79deba] text-[13px] font-medium inline-flex items-center gap-1 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </div>

                {goals.length > 0 && (
                  <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto">
                    {goals.map((g, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#e5e7eb] dark:border-white/[0.08] text-[13px]"
                      >
                        <span className="truncate text-[#191c1d] dark:text-zinc-100">
                          {g.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveGoal(idx)}
                          className="text-[#3e4944] hover:text-[#ba1a1a] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional First Milestone */}
              <div className="pt-2 border-t border-[#e5e7eb] dark:border-white/[0.08]">
                <label className="flex items-center gap-1.5 text-[13px] font-medium text-[#191c1d] dark:text-zinc-200 mb-1.5">
                  <Flag className="w-4 h-4 text-[#006c52] dark:text-[#79deba]" />
                  <span>First Milestone (Optional)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    value={milestoneTitle}
                    onChange={(e) => setMilestoneTitle(e.target.value)}
                    placeholder="e.g. MVP Architecture Sign-off"
                    className="sm:col-span-2 h-[40px] px-3.5 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#bdc9c2] dark:border-white/[0.12] text-[13px] text-[#191c1d] dark:text-white placeholder:text-[#3e4944]/60 focus:outline-none focus:border-[#006c52] dark:focus:border-[#79deba]"
                  />
                  <input
                    type="date"
                    value={milestoneDate}
                    onChange={(e) => setMilestoneDate(e.target.value)}
                    className="h-[40px] px-3 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#bdc9c2] dark:border-white/[0.12] text-[13px] text-[#191c1d] dark:text-white focus:outline-none focus:border-[#006c52] dark:focus:border-[#79deba]"
                  />
                </div>
              </div>

              {/* Admin Role & Join Code Summary */}
              <div className="flex items-center gap-2.5 p-3 rounded-[10px] bg-[#e6f7f1]/70 dark:bg-[#006c52]/15 border border-[#79deba]/50 dark:border-[#79deba]/25 text-[#006c52] dark:text-[#79deba] text-[12px]">
                <KeyRound className="w-4 h-4 shrink-0" />
                <span>
                  You&apos;ll be assigned as <strong>Project Admin</strong> with an auto-generated 6-character Join Code.
                </span>
              </div>
            </>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#e5e7eb] dark:border-white/[0.08]">
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 text-[13px] font-medium rounded-[8px] text-[#3e4944] dark:text-zinc-300 hover:bg-[#f3f3f3] dark:hover:bg-white/[0.06] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 text-[13px] font-medium rounded-[8px] text-[#3e4944] dark:text-zinc-300 hover:bg-[#f3f3f3] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            <div className="flex items-center gap-2.5">
              {step === 1 && (
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!name.trim()}
                  className="px-4 py-2.5 text-[13px] font-medium rounded-[8px] border border-[#bdc9c2] dark:border-white/[0.14] bg-[#f8f9fa] dark:bg-white/[0.04] hover:bg-[#eef1f2] dark:hover:bg-white/[0.08] text-[#191c1d] dark:text-zinc-100 inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <span>Add Goals</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="px-5 py-2.5 text-[13px] font-semibold rounded-[8px] bg-[#006c52] hover:bg-[#005943] dark:bg-[#66deb4] dark:hover:bg-[#52d1a4] text-white dark:text-[#111316] inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create &amp; Open</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
