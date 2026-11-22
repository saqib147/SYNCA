'use client';

import React, { useState, useEffect } from 'react';
import { Message } from '@synca/types';
import { Trash2, FileText, Download, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  senderName: string;
  senderAvatar?: string;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  isFormerMember?: boolean;
  onReact: (emoji: string) => void;
  onDelete: () => void;
  canDelete: boolean;
  variant?: 'dm' | 'channel';
}

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🎉', '👀'];
const FILE_RETENTION_MS = 24 * 60 * 60 * 1000;

function isImageAttachment(url: string) {
  return /\.(jpe?g|png|gif|webp)(\?.*)?$/i.test(url);
}

function getFileNameFromUrl(url: string) {
  try {
    const clean = url.split('?')[0];
    return decodeURIComponent(clean.split('/').pop() || 'Attachment');
  } catch {
    return url.split('/').pop() || 'Attachment';
  }
}

function formatExpiryLabel(createdAt: Date | string, nowMs: number | null) {
  if (nowMs === null) return { expired: false, label: 'Expires in 24h' };
  const createdMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdMs)) return { expired: false, label: 'Expires in 24h' };
  const remaining = createdMs + FILE_RETENTION_MS - nowMs;
  if (remaining <= 0) {
    return { expired: true, label: 'Expired (auto-deleted after 24h)' };
  }
  const totalMinutes = Math.ceil(remaining / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0) {
    return { expired: false, label: `Expires in ${hours}h ${mins}m` };
  }
  return { expired: false, label: `Expires in ${mins}m` };
}

/**
 * XSS-safe React inline markdown renderer supporting:
 * **bold**, _italic_, *italic*, `inline code`, and `- bullet` lines.
 */
function renderInlineTokens(line: string, isOwnDm: boolean): React.ReactNode[] {
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_|\*[^*]+\*)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(line.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={keyIdx++} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={keyIdx++}
          className={cn(
            'px-1.5 py-0.5 rounded-[5px] font-mono text-[12px]',
            isOwnDm
              ? 'bg-black/20 text-white'
              : 'bg-[#e7e8e9] dark:bg-white/[0.1] text-[#006c52] dark:text-[#79deba]'
          )}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (
      (token.startsWith('_') && token.endsWith('_')) ||
      (token.startsWith('*') && token.endsWith('*'))
    ) {
      nodes.push(
        <em key={keyIdx++} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else {
      nodes.push(token);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex));
  }
  return nodes;
}

function renderFormattedText(text: string, isOwnDm = false): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const bulletMatch = line.match(/^\s*-\s+(.*)$/);
    if (bulletMatch) {
      return (
        <span key={i} className="flex items-start gap-1.5 pl-1">
          <span className="select-none opacity-80">•</span>
          <span className="flex-1">{renderInlineTokens(bulletMatch[1], isOwnDm)}</span>
        </span>
      );
    }
    return (
      <React.Fragment key={i}>
        {renderInlineTokens(line, isOwnDm)}
        {i < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

export function MessageBubble({
  message,
  isOwn,
  senderName,
  senderAvatar,
  isFirstInGroup = true,
  isLastInGroup = true,
  isFormerMember = false,
  onReact,
  onDelete,
  canDelete,
  variant = 'dm',
}: MessageBubbleProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [nowMs, setNowMs] = useState<number | null>(null);

  const isSafeUrl = (url: string) => /^https?:\/\//i.test(url);
  const safeAttachments = (message.attachments || []).filter(isSafeUrl);

  // Client-only clock tick for attachment expiry countdowns (avoids SSR hydration mismatch)
  useEffect(() => {
    if (safeAttachments.length === 0) return;
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [safeAttachments.length]);

  const formatTime = (dateStr: Date | string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const textContent =
    message.plainText ||
    (typeof message.content === 'string'
      ? message.content
      : typeof (message.content as any)?.text === 'string'
        ? (message.content as any).text
        : '');

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  const isTemp = String(message._id || message.id).startsWith('temp-');
  const expiry = formatExpiryLabel(message.createdAt, nowMs);

  const renderAttachmentList = (isChannelLayout: boolean) => {
    if (safeAttachments.length === 0) return null;

    return (
      <div
        className={cn(
          'mt-2 flex flex-col gap-2',
          isChannelLayout && 'sm:flex-row sm:flex-wrap'
        )}
      >
        {safeAttachments.map((att, idx) => {
          const fileName = getFileNameFromUrl(att);

          if (expiry.expired) {
            return (
              <div
                key={idx}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] bg-[#f3f4f6] dark:bg-white/[0.04] border border-dashed border-[#bdc9c2] dark:border-white/[0.1] text-[#3e4944]/70 dark:text-zinc-500 max-w-xs select-none"
              >
                <div className="size-8 rounded-[8px] bg-[#e7e8e9] dark:bg-white/[0.06] flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium line-through truncate">
                    {fileName}
                  </p>
                  <p className="text-[10.5px]">File expired • Auto-deleted (24h)</p>
                </div>
              </div>
            );
          }

          if (isImageAttachment(att)) {
            return (
              <a
                key={idx}
                href={att}
                target="_blank"
                rel="noopener noreferrer"
                className="group/img block rounded-[10px] overflow-hidden border border-[#e5e7eb] dark:border-white/[0.1] bg-white dark:bg-[#191c22] hover:border-[#66deb4] transition-colors max-w-[260px]"
              >
                <img
                  src={att}
                  alt={fileName}
                  className="w-full max-h-[200px] object-cover bg-[#f8f9fa] dark:bg-zinc-900"
                />
                <div className="px-3 py-1.5 flex items-center justify-between gap-2 text-[11px] text-[#3e4944] dark:text-zinc-400">
                  <span className="truncate font-medium text-[#191c1d] dark:text-zinc-200">
                    {fileName}
                  </span>
                  <span className="inline-flex items-center gap-1 shrink-0 text-[#006c52] dark:text-[#79deba]">
                    <Clock className="w-3 h-3" />
                    {expiry.label}
                  </span>
                </div>
              </a>
            );
          }

          return (
            <a
              key={idx}
              href={att}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-[10px] bg-white dark:bg-[#191c22] border border-[#e5e7eb] dark:border-white/[0.1] hover:border-[#66deb4] transition-colors shadow-2xs max-w-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-8 rounded-[8px] bg-[#e6f7f1] dark:bg-[#006c52]/25 text-[#006c52] dark:text-[#66deb4] flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-[#191c1d] dark:text-zinc-100">
                    {fileName}
                  </p>
                  <p className="text-[10.5px] text-[#006c52] dark:text-[#79deba] inline-flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{expiry.label}</span>
                  </p>
                </div>
              </div>
              <Download className="w-4 h-4 text-[#3e4944]/70 dark:text-zinc-400 shrink-0" />
            </a>
          );
        })}
      </div>
    );
  };

  // ─────────────────────────────────────────────
  // CHANNEL VARIANT (Figma 80:875 — Open Slack-style feed)
  // ─────────────────────────────────────────────
  if (variant === 'channel') {
    return (
      <div
        className={cn(
          'group relative flex items-start gap-3.5 px-3 -mx-3 rounded-[10px] hover:bg-[#f8f9fa] dark:hover:bg-white/[0.03] transition-colors',
          isFirstInGroup ? 'mt-3.5 pt-1.5 pb-0.5' : 'mt-0 py-0.5'
        )}
      >
        {/* Left Avatar Column */}
        <div className="w-9 shrink-0 pt-0.5">
          {isFirstInGroup ? (
            <div
              className={cn(
                'size-9 rounded-full bg-[#e7e8e9] dark:bg-zinc-800 flex items-center justify-center font-semibold text-[13px] text-[#191c1d] dark:text-zinc-200 overflow-hidden',
                isFormerMember && 'grayscale opacity-50'
              )}
            >
              {senderAvatar ? (
                <img
                  src={senderAvatar}
                  alt={senderName}
                  className="size-full object-cover"
                />
              ) : (
                <span>{senderName.charAt(0).toUpperCase()}</span>
              )}
            </div>
          ) : (
            <span className="opacity-0 group-hover:opacity-100 text-[10px] text-[#3e4944]/60 dark:text-zinc-500 block text-right pr-1 pt-1 transition-opacity">
              {formatTime(message.createdAt)}
            </span>
          )}
        </div>

        {/* Message Body */}
        <div className="flex-1 min-w-0">
          {isFirstInGroup && (
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span
                className={cn(
                  'text-[14px] font-semibold',
                  isFormerMember
                    ? 'text-zinc-400 dark:text-zinc-500'
                    : 'text-[#191c1d] dark:text-white'
                )}
              >
                {senderName}
              </span>
              {isFormerMember && (
                <span className="px-1.5 py-0.5 rounded bg-[#e7e8e9] dark:bg-white/[0.06] text-[10px] font-medium text-zinc-500 dark:text-zinc-500">
                  Former member
                </span>
              )}
              <span className="text-[11px] text-[#3e4944]/70 dark:text-zinc-500">
                {formatTime(message.createdAt)}
              </span>
              {isTemp && (
                <span className="text-[11px] italic text-[#3e4944]/60 dark:text-zinc-500">
                  sending...
                </span>
              )}
            </div>
          )}

          {textContent && (
            <div
              className={cn(
                'text-[14px] leading-[21px] break-words',
                isFormerMember
                  ? 'text-[#3e4944]/75 dark:text-zinc-400'
                  : 'text-[#191c1d]/90 dark:text-zinc-200'
              )}
            >
              {renderFormattedText(textContent, false)}
            </div>
          )}

          {renderAttachmentList(true)}

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {message.reactions.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onReact(r.emoji)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f1f3f4] dark:bg-white/[0.08] hover:bg-[#e6f7f1] dark:hover:bg-[#006c52]/25 border border-[#e5e7eb] dark:border-white/[0.08] text-[12px] text-[#191c1d] dark:text-zinc-200 transition-colors cursor-pointer"
                >
                  <span>{r.emoji}</span>
                  <span className="font-semibold text-[11px]">
                    {r.userIds?.length || 1}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hover Actions */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-3 -top-3 flex items-center gap-0.5 bg-white dark:bg-[#1e2127] border border-[#e5e7eb] dark:border-white/[0.12] rounded-full px-1.5 py-0.5 shadow-sm z-10">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onReact(emoji)}
              className="hover:scale-125 transition-transform p-1 text-xs cursor-pointer"
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1 text-[#3e4944] dark:text-zinc-400 hover:text-[#ba1a1a] dark:hover:text-rose-400 rounded-full transition-colors ml-0.5 cursor-pointer"
              title="Delete message"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // DM VARIANT (Figma 86:330 & 86:890)
  // ─────────────────────────────────────────────
  const getRadiusClass = () => {
    if (isOwn) {
      if (isFirstInGroup && isLastInGroup) return 'rounded-[14px] rounded-br-[4px]';
      if (isFirstInGroup && !isLastInGroup) return 'rounded-[14px] rounded-br-[6px]';
      if (!isFirstInGroup && !isLastInGroup) return 'rounded-[14px] rounded-r-[6px]';
      return 'rounded-[14px] rounded-tr-[6px] rounded-br-[4px]';
    } else {
      if (isFirstInGroup && isLastInGroup) return 'rounded-[14px] rounded-bl-[4px]';
      if (isFirstInGroup && !isLastInGroup) return 'rounded-[14px] rounded-bl-[6px]';
      if (!isFirstInGroup && !isLastInGroup) return 'rounded-[14px] rounded-l-[6px]';
      return 'rounded-[14px] rounded-tl-[6px] rounded-bl-[4px]';
    }
  };

  return (
    <div
      className={cn(
        'group relative flex items-end gap-2.5 max-w-[78%] sm:max-w-[68%] transition-all',
        isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto',
        isFirstInGroup ? 'mt-3.5' : 'mt-0.5'
      )}
    >
      {/* Avatar */}
      <div className="size-8 shrink-0">
        {isLastInGroup ? (
          isOwn ? (
            <div className="size-8 rounded-full bg-[#006c52] text-white flex items-center justify-center text-[10px] font-bold overflow-hidden">
              {senderAvatar ? (
                <img
                  src={senderAvatar}
                  alt="You"
                  className="size-full object-cover"
                />
              ) : (
                <span>ME</span>
              )}
            </div>
          ) : (
            <div className="size-8 rounded-full bg-[#e7e8e9] dark:bg-zinc-700 flex items-center justify-center font-semibold text-xs text-[#191c1d] dark:text-zinc-200 overflow-hidden">
              {senderAvatar ? (
                <img
                  src={senderAvatar}
                  alt={senderName}
                  className="size-full object-cover"
                />
              ) : (
                <span>{senderName.charAt(0).toUpperCase()}</span>
              )}
            </div>
          )
        ) : (
          <div className="size-8 invisible" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'flex flex-col space-y-1',
          isOwn ? 'items-end' : 'items-start'
        )}
      >
        {isFirstInGroup && (
          <div
            className={cn(
              'flex items-center gap-1.5 text-[11px] px-1',
              isOwn ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            <span className="font-semibold text-[#191c1d] dark:text-zinc-200">
              {isOwn ? 'You' : senderName}
            </span>
            <span className="text-[#3e4944]/65 dark:text-zinc-500">
              {formatTime(message.createdAt)}
            </span>
            {isTemp && (
              <span className="italic text-[#3e4944]/50 dark:text-zinc-500">sending...</span>
            )}
          </div>
        )}

        {textContent && (
          <div className="relative inline-block text-left">
            <div
              className={cn(
                'px-4 py-2 text-[13.5px] leading-[20px] break-words transition-all',
                getRadiusClass(),
                isOwn
                  ? 'bg-[#3eb386] dark:bg-[#006c52] text-white'
                  : 'bg-[#f1f3f4] dark:bg-[#1e2127] text-[#191c1d] dark:text-zinc-100'
              )}
            >
              {renderFormattedText(textContent, isOwn)}
            </div>

            <div
              className={cn(
                'absolute -top-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white dark:bg-[#1e2127] border border-[#e5e7eb] dark:border-white/[0.12] rounded-full px-1.5 py-0.5 shadow-md z-10',
                isOwn ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'
              )}
            >
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact(emoji)}
                  className="hover:scale-125 transition-transform p-1 text-xs cursor-pointer"
                  title={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="p-1 text-[#3e4944] dark:text-zinc-400 hover:text-[#ba1a1a] dark:hover:text-rose-400 rounded-full transition-colors ml-0.5 cursor-pointer"
                  title="Delete message"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {renderAttachmentList(false)}

        {message.reactions && message.reactions.length > 0 && (
          <div
            className={cn(
              'flex flex-wrap gap-1 mt-1',
              isOwn && 'justify-end'
            )}
          >
            {message.reactions.map((r, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onReact(r.emoji)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f1f3f4] dark:bg-white/[0.08] hover:bg-[#e6f7f1] dark:hover:bg-[#006c52]/25 border border-[#e5e7eb] dark:border-white/[0.08] text-[11px] text-[#191c1d] dark:text-zinc-200 transition-colors cursor-pointer"
              >
                <span>{r.emoji}</span>
                <span className="font-semibold text-[10px]">
                  {r.userIds?.length || 1}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
