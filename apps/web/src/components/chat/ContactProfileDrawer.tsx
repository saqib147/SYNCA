'use client';

import React, { useState } from 'react';
import { ConversationTarget } from './ChatSidebar';
import { KeyRound, Copy, Check, Hash, FileText, Download, X } from 'lucide-react';
import { Project } from '@synca/types';
import { cn } from '@/lib/utils';

interface ContactProfileDrawerProps {
  target: ConversationTarget;
  project?: Project | null;
  onClose?: () => void;
}

export function ContactProfileDrawer({ target, project, onClose }: ContactProfileDrawerProps) {
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = () => {
    if (project?.joinCode) {
      navigator.clipboard.writeText(project.joinCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const isChannel = target.type === 'channel';

  return (
    <div className="w-80 p-6 space-y-6 hidden xl:block bg-zinc-50/50 dark:bg-zinc-900/40 border-l border-zinc-200/80 dark:border-white/[0.08] h-full overflow-y-auto">
      {/* Header Close on smaller screens if applicable */}
      {onClose && (
        <div className="flex justify-end xl:hidden">
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profile Overview */}
      <div className="text-center space-y-3">
        <div className="relative inline-block">
          {isChannel ? (
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-3xl font-bold shadow-sm">
              <Hash className="w-10 h-10" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-zinc-200 dark:bg-zinc-700 mx-auto flex items-center justify-center text-2xl font-bold text-zinc-700 dark:text-zinc-200 overflow-hidden shadow-sm">
              {target.avatarUrl ? (
                <img src={target.avatarUrl} alt={target.name} className="w-full h-full object-cover" />
              ) : (
                <span>{target.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
          )}
          {!isChannel && (
            <span
              className={cn(
                'absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900',
                target.isOnline ? 'bg-emerald-500' : 'bg-zinc-400'
              )}
            />
          )}
        </div>

        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">{target.name}</h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">{target.subtitle || 'Active conversation'}</p>
        </div>
      </div>

      {/* Project Details (if channel) */}
      {isChannel && project && (
        <div className="space-y-4">
          {/* Join Code Card */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5 font-medium">
                <KeyRound className="w-3.5 h-3.5 text-lime-500" />
                <span>Project Join Code</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 font-mono">
                {project.joinCode}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className="w-full py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs text-zinc-700 dark:text-zinc-200 font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Join Code</span>
                </>
              )}
            </button>
          </div>

          {/* Project Stats */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08]">
              <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{project.teamMembers?.length || project.members?.length || 1}</p>
              <p className="text-[10px] text-zinc-400 uppercase font-semibold">Members</p>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08]">
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{project.status}</p>
              <p className="text-[10px] text-zinc-400 uppercase font-semibold">Status</p>
            </div>
          </div>
        </div>
      )}

      {/* Shared Media / Privacy notice */}
      <div className="space-y-2 pt-2 border-t border-zinc-200/80 dark:border-white/[0.08]">
        <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Privacy & Security</h4>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
          {isChannel
            ? 'Messages and attachments in this channel are visible to all verified project members.'
            : 'Direct messages are end-to-end encrypted in transit and restricted to you and this recipient.'}
        </p>
      </div>
    </div>
  );
}

