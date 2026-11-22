'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { ConversationTarget } from './ChatSidebar';
import {
  KeyRound,
  Copy,
  Check,
  Hash,
  FileText,
  X,
  Search,
  BellOff,
  Bell,
  Clock,
  Users,
  FolderKanban,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { Message, Project } from '@synca/types';
import { cn } from '@/lib/utils';

interface ContactProfileDrawerProps {
  target: ConversationTarget;
  project?: Project | null;
  sharedProjects?: string[];
  messages?: Message[];
  onSearchClick?: () => void;
  onDeleteConversation?: () => void;
  onClose?: () => void;
  detached?: boolean;
}

export function ContactProfileDrawer({
  target,
  project,
  sharedProjects = [],
  messages = [],
  onSearchClick,
  onDeleteConversation,
  onClose,
  detached = false,
}: ContactProfileDrawerProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const handleCopyCode = () => {
    if (project?.joinCode) {
      navigator.clipboard.writeText(project.joinCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Extract real shared attachments with timestamps from live conversation messages
  const sharedFiles = useMemo(() => {
    const items: { url: string; createdAt: Date | string }[] = [];
    messages.forEach((m) => {
      (m.attachments || []).forEach((att) => {
        if (/^https?:\/\//i.test(att)) {
          items.push({ url: att, createdAt: m.createdAt });
        }
      });
    });
    return items.slice(-6).reverse();
  }, [messages]);

  const isChannel = target.type === 'channel';
  const [localTime, setLocalTime] = useState<string>('');
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      setNowMs(Date.now());
      try {
        setLocalTime(
          new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
        );
      } catch {
        setLocalTime('');
      }
    };
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <aside
      className={cn(
        'w-[300px] shrink-0 flex flex-col overflow-y-auto scrollbar-thin',
        detached
          ? 'h-[calc(100vh-2rem)] rounded-[20px] bg-white dark:bg-[#111316] border border-[#e5e5e5] dark:border-white/[0.08]'
          : 'h-full bg-[#fafafa] dark:bg-[#14171c] border-l border-[#e5e7eb] dark:border-white/[0.08]'
      )}
    >
      {/* Top Close (when dismissible) */}
      {onClose && (
        <div className="flex justify-end px-4 pt-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile panel"
            className="p-1.5 rounded-[8px] text-[#3e4944] dark:text-zinc-400 hover:bg-[#f3f3f3] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profile Header (Figma 86:890) */}
      <div className={cn('px-6 pb-6 text-center space-y-3', !onClose && 'pt-7')}>
        <div className="relative inline-block">
          {isChannel ? (
            <div className="size-[76px] rounded-[16px] bg-[#eefaf5] dark:bg-[#006c52]/20 border border-[#79deba]/60 text-[#006c52] dark:text-[#66deb4] mx-auto flex items-center justify-center">
              <Hash className="w-9 h-9" />
            </div>
          ) : (
            <div className="size-[76px] rounded-[16px] bg-[#e7e8e9] dark:bg-zinc-800 mx-auto flex items-center justify-center text-2xl font-semibold text-[#191c1d] dark:text-zinc-100 overflow-hidden">
              {target.avatarUrl ? (
                <img
                  src={target.avatarUrl}
                  alt={target.name}
                  className="size-full object-cover"
                />
              ) : (
                <span>{target.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
          )}
          {!isChannel && (
            <span
              className={cn(
                'absolute -bottom-1 -right-1 size-4 rounded-full border-[3px] border-white dark:border-[#111316]',
                target.isOnline ? 'bg-[#66deb4]' : 'bg-zinc-400'
              )}
            />
          )}
        </div>

        <div>
          <h3 className="font-['Funnel_Display',sans-serif] font-medium text-[19px] text-[#191c1d] dark:text-white truncate">
            {target.name}
          </h3>
          <p className="text-[12.5px] text-[#3e4944] dark:text-zinc-400 mt-0.5 truncate">
            {isChannel
              ? target.subtitle || 'Project channel'
              : target.isOnline
                ? 'Active now'
                : 'Offline'}
          </p>
        </div>

        {/* 3 Quick Action Squares (Figma 86:890) */}
        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            className="flex flex-col items-center gap-1.5 group cursor-pointer"
          >
            <div
              className={cn(
                'size-10 rounded-[10px] border flex items-center justify-center transition-colors',
                isMuted
                  ? 'bg-[#e6f7f1] dark:bg-[#006c52]/25 border-[#79deba] text-[#006c52] dark:text-[#66deb4]'
                  : 'bg-[#f8f9fa] dark:bg-white/[0.04] border-[#e5e7eb] dark:border-white/[0.08] text-[#3e4944] dark:text-zinc-300 group-hover:border-[#bdc9c2]'
              )}
            >
              {isMuted ? (
                <BellOff className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
            </div>
            <span className="text-[11px] text-[#3e4944] dark:text-zinc-400">
              {isMuted ? 'Muted' : 'Mute'}
            </span>
          </button>

          {onSearchClick && (
            <button
              type="button"
              onClick={onSearchClick}
              className="flex flex-col items-center gap-1.5 group cursor-pointer"
            >
              <div className="size-10 rounded-[10px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#e5e7eb] dark:border-white/[0.08] text-[#3e4944] dark:text-zinc-300 group-hover:border-[#006c52] dark:group-hover:border-[#66deb4] flex items-center justify-center transition-colors">
                <Search className="w-4 h-4" />
              </div>
              <span className="text-[11px] text-[#3e4944] dark:text-zinc-400">
                Search
              </span>
            </button>
          )}

          {isChannel && project && (
            <Link
              href={`/projects/${project._id}`}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className="size-10 rounded-[10px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#e5e7eb] dark:border-white/[0.08] text-[#3e4944] dark:text-zinc-300 group-hover:border-[#006c52] dark:group-hover:border-[#66deb4] flex items-center justify-center transition-colors">
                <ExternalLink className="w-4 h-4" />
              </div>
              <span className="text-[11px] text-[#3e4944] dark:text-zinc-400">
                Project
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* ABOUT Section (Figma 86:890) */}
      <div className="px-6 py-5 border-t border-[#e5e7eb] dark:border-white/[0.08] space-y-3.5">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#3e4944] dark:text-zinc-400">
          About
        </h4>

        <div className="space-y-3 text-[13px]">
          <div className="flex items-start gap-2.5 text-[#191c1d] dark:text-zinc-200">
            <Clock className="w-4 h-4 text-[#3e4944]/70 dark:text-zinc-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">{localTime} Local Time</p>
              <p className="text-[11px] text-[#3e4944]/70 dark:text-zinc-500">
                {target.isOnline ? 'Currently online' : 'Away / Offline'}
              </p>
            </div>
          </div>

          {!isChannel && sharedProjects.length > 0 && (
            <div className="flex items-start gap-2.5 text-[#191c1d] dark:text-zinc-200">
              <FolderKanban className="w-4 h-4 text-[#006c52] dark:text-[#66deb4] mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium">Shared Projects</p>
                <p className="text-[12px] text-[#3e4944] dark:text-zinc-400 mt-0.5 leading-relaxed">
                  {sharedProjects.join(', ')}
                </p>
              </div>
            </div>
          )}

          {isChannel && project && (
            <>
              <div className="flex items-center gap-2.5 text-[#191c1d] dark:text-zinc-200">
                <Users className="w-4 h-4 text-[#006c52] dark:text-[#66deb4] shrink-0" />
                <span>
                  {project.teamMembers?.length || project.members?.length || 1}{' '}
                  project members
                </span>
              </div>

              {project.privacy !== 'Private' && project.joinCode && (
                <div className="p-3 rounded-[10px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#e5e7eb] dark:border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="inline-flex items-center gap-1.5 text-[#3e4944] dark:text-zinc-400">
                      <KeyRound className="w-3.5 h-3.5 text-[#006c52] dark:text-[#66deb4]" />
                      Join Code
                    </span>
                    <span className="font-mono font-bold tracking-[0.15em] text-[#191c1d] dark:text-white">
                      {project.joinCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="w-full py-1.5 rounded-[6px] bg-white dark:bg-white/[0.08] border border-[#bdc9c2] dark:border-white/[0.12] text-[12px] font-medium text-[#191c1d] dark:text-zinc-200 inline-flex items-center justify-center gap-1.5 hover:border-[#006c52] dark:hover:border-[#66deb4] transition-colors cursor-pointer"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#006c52] dark:text-[#66deb4]" />
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
              )}
            </>
          )}
        </div>
      </div>

      {/* SHARED MEDIA / FILES Section (Figma 86:890 — real conversation attachments) */}
      <div className="px-6 py-5 border-t border-[#e5e7eb] dark:border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#3e4944] dark:text-zinc-400">
            Shared Files
          </h4>
          {sharedFiles.length > 0 && (
            <span className="text-[11.5px] font-medium text-[#006c52] dark:text-[#66deb4]">
              {sharedFiles.length}
            </span>
          )}
        </div>

        {sharedFiles.length > 0 ? (
          <div className="space-y-2">
            {sharedFiles.map((item, idx) => {
              const createdMs = new Date(item.createdAt).getTime();
              const remaining =
                nowMs !== null && !Number.isNaN(createdMs)
                  ? createdMs + 24 * 60 * 60 * 1000 - nowMs
                  : 1;
              const isExpired = remaining <= 0;
              const hoursLeft = Math.floor(Math.max(0, remaining) / 3_600_000);
              const minsLeft = Math.ceil((Math.max(0, remaining) % 3_600_000) / 60_000);
              const fileName = item.url.split('?')[0].split('/').pop() || 'File';

              if (isExpired) {
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-2.5 rounded-[8px] bg-[#f3f4f6] dark:bg-white/[0.03] border border-dashed border-[#bdc9c2] dark:border-white/[0.08] text-[#3e4944]/65 dark:text-zinc-500"
                  >
                    <div className="size-8 rounded-[6px] bg-[#e7e8e9] dark:bg-white/[0.06] flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium line-through truncate">
                        {fileName}
                      </p>
                      <p className="text-[10px]">Expired (24h)</p>
                    </div>
                  </div>
                );
              }

              return (
                <a
                  key={idx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-2.5 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#e5e7eb] dark:border-white/[0.08] hover:border-[#66deb4] transition-colors"
                >
                  <div className="size-8 rounded-[6px] bg-[#e6f7f1] dark:bg-[#006c52]/25 text-[#006c52] dark:text-[#66deb4] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-[#191c1d] dark:text-zinc-200 truncate">
                      {fileName}
                    </p>
                    <p className="text-[10px] text-[#006c52] dark:text-[#79deba]">
                      {nowMs !== null
                        ? hoursLeft > 0
                          ? `Expires in ${hoursLeft}h ${minsLeft}m`
                          : `Expires in ${minsLeft}m`
                        : 'Expires in 24h'}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <p className="text-[12px] text-[#3e4944]/70 dark:text-zinc-500">
            Files shared in this conversation will appear here.
          </p>
        )}
      </div>

      {/* Delete DM Conversation Action */}
      {!isChannel && onDeleteConversation && (
        <div className="px-6 py-5 mt-auto border-t border-[#e5e7eb] dark:border-white/[0.08]">
          <button
            type="button"
            onClick={onDeleteConversation}
            className="w-full py-2.5 px-4 rounded-[8px] bg-[#ffdad6]/60 hover:bg-[#ffdad6] dark:bg-rose-500/15 dark:hover:bg-rose-500/25 border border-[#ba1a1a]/30 text-[#93000a] dark:text-rose-300 text-[12.5px] font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Conversation</span>
          </button>
        </div>
      )}
    </aside>
  );
}
