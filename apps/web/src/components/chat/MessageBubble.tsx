'use client';

import React, { useState } from 'react';
import { Message, Reaction } from '@synca/types';
import { Trash2, Smile, FileText, Download, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  senderName: string;
  senderAvatar?: string;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  onReact: (emoji: string) => void;
  onDelete: () => void;
  canDelete: boolean;
}

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🎉', '👀'];

export function MessageBubble({
  message,
  isOwn,
  senderName,
  senderAvatar,
  isFirstInGroup = true,
  isLastInGroup = true,
  onReact,
  onDelete,
  canDelete,
}: MessageBubbleProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Bubble border radius calculation for smooth iMessage/Slack-style grouping
  const getRadiusClass = () => {
    if (isOwn) {
      if (isFirstInGroup && isLastInGroup) return 'rounded-2xl rounded-tr-sm';
      if (isFirstInGroup && !isLastInGroup) return 'rounded-2xl rounded-tr-sm rounded-br-md';
      if (!isFirstInGroup && !isLastInGroup) return 'rounded-2xl rounded-r-md';
      return 'rounded-2xl rounded-tr-md rounded-br-sm';
    } else {
      if (isFirstInGroup && isLastInGroup) return 'rounded-2xl rounded-tl-sm';
      if (isFirstInGroup && !isLastInGroup) return 'rounded-2xl rounded-tl-sm rounded-bl-md';
      if (!isFirstInGroup && !isLastInGroup) return 'rounded-2xl rounded-l-md';
      return 'rounded-2xl rounded-tl-md rounded-bl-sm';
    }
  };

  return (
    <div
      className={cn(
        'group relative flex gap-3 max-w-2xl transition-all',
        isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto',
        isFirstInGroup ? 'mt-3' : 'mt-0.5'
      )}
    >
      {/* Avatar (only rendered for incoming messages) */}
      {!isOwn && (
        <div className="w-8 h-8 flex-shrink-0">
          {isFirstInGroup ? (
            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-700 dark:text-zinc-200 overflow-hidden shadow-sm">
              {senderAvatar ? (
                <img src={senderAvatar} alt={senderName} className="w-full h-full object-cover" />
              ) : (
                <span>{senderName.charAt(0).toUpperCase()}</span>
              )}
            </div>
          ) : (
            <div className="w-8 h-8 invisible" />
          )}
        </div>
      )}

      {/* Message Content */}
      <div className={cn('space-y-0.5', isOwn ? 'text-right items-end' : 'text-left items-start')}>
        {/* Meta Header (Only on the first message of a group) */}
        {isFirstInGroup && (
          <div
            className={cn(
              'flex items-center gap-2 text-[10px] text-zinc-400 dark:text-zinc-500 font-medium px-1',
              isOwn && 'justify-end'
            )}
          >
            {!isOwn && <span className="font-semibold text-zinc-700 dark:text-zinc-300">{senderName}</span>}
            <span>{formatTime(message.createdAt)}</span>
            {isTemp && <span className="italic text-zinc-400">sending...</span>}
          </div>
        )}

        {/* Bubble */}
        <div className="relative inline-block text-left">
          <div
            className={cn(
              'p-3 rounded-2xl text-xs leading-relaxed break-words shadow-sm max-w-lg transition-all',
              getRadiusClass(),
              isOwn
                ? 'bg-[#2ecc8f] dark:bg-emerald-600 text-white font-medium'
                : 'bg-zinc-100 dark:bg-zinc-800/95 text-zinc-900 dark:text-zinc-100 border border-zinc-200/60 dark:border-white/[0.06]'
            )}
          >
            {textContent}

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {message.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      'flex items-center justify-between gap-3 p-2.5 rounded-xl border text-left transition-colors',
                      isOwn
                        ? 'bg-black/15 border-white/20 hover:bg-black/25 text-white'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate text-xs font-semibold">
                        {att.split('/').pop() || 'Attachment'}
                      </span>
                    </div>
                    <Download className="w-3.5 h-3.5 flex-shrink-0 opacity-70 group-hover:opacity-100" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Hover Floating Actions Menu */}
          <div
            className={cn(
              'absolute -top-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-full px-1.5 py-0.5 shadow-md z-10',
              isOwn ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'
            )}
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                className="hover:scale-125 transition-transform p-1 text-xs"
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1 text-zinc-400 hover:text-rose-500 rounded-full transition-colors ml-0.5"
                title="Delete message"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Reaction Badges */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={cn('flex flex-wrap gap-1 mt-1', isOwn && 'justify-end')}>
            {message.reactions.map((r, idx) => (
              <button
                key={idx}
                onClick={() => onReact(r.emoji)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200/80 dark:border-white/[0.08] text-[11px] text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                <span>{r.emoji}</span>
                <span className="font-semibold text-[10px]">{r.userIds?.length || 1}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
