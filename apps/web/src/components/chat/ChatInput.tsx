'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  PlusCircle,
  Smile,
  Send,
  X,
  Loader2,
  FileText,
  Bold,
  Italic,
  Code,
  List,
} from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { API_BASE_URL } from '@/lib/env';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (content: string, attachments: string[]) => Promise<void> | void;
  onTyping: (isTyping: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  projectId?: string;
  variant?: 'dm' | 'channel';
}

const COMMON_EMOJIS = [
  '😀',
  '😂',
  '🔥',
  '👍',
  '🎉',
  '❤️',
  '🙌',
  '🚀',
  '👀',
  '✨',
  '💯',
  '🤔',
];

export function ChatInput({
  onSend,
  onTyping,
  placeholder = 'Type a message...',
  disabled = false,
  projectId,
  variant = 'dm',
}: ChatInputProps) {
  const { getToken } = useAuth();
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<{ url: string; name: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const rafId = window.requestAnimationFrame(() => {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [text]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onTyping(e.target.value.length > 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if ((!text.trim() && attachments.length === 0) || disabled || isUploading) return;
    const content = text.trim();
    const attUrls = attachments.map((a) => a.url);

    setText('');
    setAttachments([]);
    onTyping(false);
    setShowEmojiPicker(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await onSend(content, attUrls);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);
    setUploadError(null);

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', file);
      if (projectId) {
        formData.append('projectId', projectId);
      }

      const res = await fetch(`${API_BASE_URL}/api/v1/files/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message || 'File upload failed');
      }
      const fileUrl = data.data?.cloudinaryUrl || data.data?.url || '';

      if (fileUrl) {
        setAttachments((prev) => [...prev, { url: fileUrl, name: file.name }]);
      }
    } catch (err: any) {
      console.error('[ChatInput] Upload error:', err);
      setUploadError(err?.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const addEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const wrapSelection = (prefix: string, suffix = prefix, placeholderText = '') => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const selected = text.slice(start, end);
    const inner = selected || placeholderText;
    const updated =
      text.slice(0, start) + prefix + inner + suffix + text.slice(end);
    setText(updated);
    onTyping(updated.length > 0);
    setTimeout(() => {
      el.focus();
      const selStart = start + prefix.length;
      const selEnd = selStart + inner.length;
      el.setSelectionRange(selStart, selEnd);
    }, 0);
  };

  const insertBulletLine = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const needsNewline = start > 0 && text[start - 1] !== '\n';
    const prefix = needsNewline ? '\n- ' : '- ';
    const selected = text.slice(start, end);
    const updated = text.slice(0, start) + prefix + selected + text.slice(end);
    setText(updated);
    onTyping(updated.length > 0);
    setTimeout(() => {
      el.focus();
      const pos = start + prefix.length + selected.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  };

  const renderFormattingToolbar = (borderClass: string) => (
    <div
      className={cn(
        'px-3 py-1.5 border-b flex items-center gap-1 text-[#3e4944] dark:text-zinc-400',
        borderClass
      )}
    >
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => wrapSelection('**', '**', 'bold')}
        title="Bold (**text**)"
        className="p-1.5 rounded-[6px] hover:bg-[#e6f7f1] dark:hover:bg-white/[0.08] hover:text-[#006c52] dark:hover:text-[#79deba] transition-colors cursor-pointer"
      >
        <Bold className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => wrapSelection('_', '_', 'italic')}
        title="Italic (_text_)"
        className="p-1.5 rounded-[6px] hover:bg-[#e6f7f1] dark:hover:bg-white/[0.08] hover:text-[#006c52] dark:hover:text-[#79deba] transition-colors cursor-pointer"
      >
        <Italic className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => wrapSelection('`', '`', 'code')}
        title="Inline code (`code`)"
        className="p-1.5 rounded-[6px] hover:bg-[#e6f7f1] dark:hover:bg-white/[0.08] hover:text-[#006c52] dark:hover:text-[#79deba] transition-colors cursor-pointer"
      >
        <Code className="w-3.5 h-3.5" />
      </button>
      <span className="h-3.5 w-[1px] bg-[#bdc9c2] dark:bg-white/[0.1] mx-1" />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={insertBulletLine}
        title="Bullet list (- item)"
        className="p-1.5 rounded-[6px] hover:bg-[#e6f7f1] dark:hover:bg-white/[0.08] hover:text-[#006c52] dark:hover:text-[#79deba] transition-colors cursor-pointer"
      >
        <List className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !disabled && !isUploading;

  // ─────────────────────────────────────────────
  // CHANNEL VARIANT (Figma 80:875 — Mint-bordered toolbar composer)
  // ─────────────────────────────────────────────
  if (variant === 'channel') {
    return (
      <div className="relative">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Top Formatting Toolbar */}
        {renderFormattingToolbar('border-[#a7e9d2]/60 dark:border-[#66deb4]/20')}

        {/* Upload Error / Pending Attachments */}
        {uploadError && (
          <div className="mx-3.5 mt-2 px-3 py-1.5 rounded-[8px] bg-[#ffdad6] dark:bg-rose-500/15 text-[#93000a] dark:text-rose-300 text-[12px] flex items-center justify-between">
            <span>{uploadError}</span>
            <button type="button" onClick={() => setUploadError(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3.5 pt-2.5">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-white dark:bg-[#191c22] text-[12px] text-[#191c1d] dark:text-zinc-200 border border-[#bdc9c2] dark:border-white/[0.1]"
              >
                <FileText className="w-3.5 h-3.5 text-[#006c52] dark:text-[#66deb4]" />
                <span className="truncate max-w-[160px] font-medium">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="hover:text-[#ba1a1a] dark:hover:text-rose-400 ml-1 cursor-pointer"
                  >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Emoji Popover */}
        {showEmojiPicker && (
          <div
            ref={emojiPickerRef}
            className="absolute bottom-14 right-14 p-2 rounded-[12px] bg-white dark:bg-[#1e2127] border border-[#e5e7eb] dark:border-white/[0.12] shadow-xl grid grid-cols-6 gap-1 z-20"
          >
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => addEmoji(emoji)}
                className="p-1.5 text-base hover:bg-[#f3f4f6] dark:hover:bg-white/[0.08] rounded-[8px] transition-transform hover:scale-110 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Textarea + Bottom-Right Controls */}
        <div className="flex items-end gap-2 px-3.5 py-2.5">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent py-1 text-[13.5px] text-[#191c1d] dark:text-zinc-100 placeholder-[#3e4944]/60 dark:placeholder-zinc-500 focus:outline-none resize-none max-h-32 leading-[21px]"
          />

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              className="p-2 rounded-[8px] text-[#3e4944] dark:text-zinc-400 hover:bg-[#e6f7f1] dark:hover:bg-white/[0.08] hover:text-[#006c52] dark:hover:text-[#79deba] transition-colors cursor-pointer"
              title="Attach file"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#006c52] dark:text-[#66deb4]" />
              ) : (
                <PlusCircle className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className="p-2 rounded-[8px] text-[#3e4944] dark:text-zinc-400 hover:bg-[#e6f7f1] dark:hover:bg-white/[0.08] hover:text-[#006c52] dark:hover:text-[#66deb4] transition-colors cursor-pointer"
              title="Insert emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className="size-8 rounded-[8px] bg-[#006c52] hover:bg-[#005742] dark:bg-[#66deb4] dark:hover:bg-[#52d1a4] text-white dark:text-[#111316] flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
              title="Send message (Enter)"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // DM VARIANT (Figma 86:330 — Clean rounded pill input)
  // ─────────────────────────────────────────────
  return (
    <div className="relative px-5 py-3.5 border-t border-[#e5e7eb] dark:border-white/[0.08] bg-white dark:bg-[#111316]">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
      />

      {uploadError && (
        <div className="mb-2 px-3 py-1.5 rounded-[8px] bg-[#ffdad6] dark:bg-rose-500/15 text-[#93000a] dark:text-rose-300 text-[12px] flex items-center justify-between">
          <span>{uploadError}</span>
          <button type="button" onClick={() => setUploadError(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2.5">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.06] text-[12px] text-[#191c1d] dark:text-zinc-200 border border-[#bdc9c2] dark:border-white/[0.1]"
            >
              <FileText className="w-3.5 h-3.5 text-[#006c52] dark:text-[#66deb4]" />
              <span className="truncate max-w-[160px] font-medium">{att.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="hover:text-[#ba1a1a] dark:hover:text-rose-400 ml-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-16 right-16 p-2 rounded-[12px] bg-white dark:bg-[#1e2127] border border-[#e5e7eb] dark:border-white/[0.12] shadow-xl grid grid-cols-6 gap-1 z-20"
        >
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => addEmoji(emoji)}
              className="p-1.5 text-base hover:bg-[#f3f4f6] dark:hover:bg-white/[0.08] rounded-[8px] transition-transform hover:scale-110 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-[14px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#bdc9c2] dark:border-white/[0.12] focus-within:border-[#006c52] dark:focus-within:border-[#66deb4] transition-colors overflow-hidden">
        {renderFormattingToolbar('border-[#e5e7eb] dark:border-white/[0.08]')}

        <div className="flex items-end gap-2 px-3 py-1.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="p-1.5 rounded-full text-[#3e4944] dark:text-zinc-400 hover:text-[#006c52] dark:hover:text-[#79deba] transition-colors shrink-0 mb-0.5 cursor-pointer"
            title="Attach file (max 25 MB, auto-deletes after 24h)"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#006c52] dark:text-[#66deb4]" />
            ) : (
              <PlusCircle className="w-5 h-5 stroke-[1.6]" />
            )}
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent py-1.5 text-[13.5px] text-[#191c1d] dark:text-zinc-100 placeholder-[#3e4944]/60 dark:placeholder-zinc-500 focus:outline-none resize-none max-h-32 leading-[20px]"
          />

          <button
            type="button"
            onClick={() => setShowEmojiPicker((v) => !v)}
            className="p-1.5 rounded-full text-[#3e4944] dark:text-zinc-400 hover:text-[#006c52] dark:hover:text-[#66deb4] transition-colors shrink-0 mb-0.5 cursor-pointer"
            title="Insert emoji"
          >
            <Smile className="w-5 h-5 stroke-[1.6]" />
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="size-8 rounded-full bg-[#006c52] hover:bg-[#005742] dark:bg-[#66deb4] dark:hover:bg-[#52d1a4] text-white dark:text-[#111316] flex items-center justify-center transition-colors disabled:opacity-40 shrink-0 mb-0.5 cursor-pointer"
            title="Send message (Enter)"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
