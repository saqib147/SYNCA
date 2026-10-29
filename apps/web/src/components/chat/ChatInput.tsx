'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Smile, Send, X, Loader2, FileText } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (content: string, attachments: string[]) => Promise<void> | void;
  onTyping: (isTyping: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
}

const COMMON_EMOJIS = ['😀', '😂', '🔥', '👍', '🎉', '❤️', '🙌', '🚀', '👀', '✨', '💯', '🤔'];

export function ChatInput({
  onSend,
  onTyping,
  placeholder = 'Type a message...',
  disabled = false,
}: ChatInputProps) {
  const { getToken } = useAuth();
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<{ url: string; name: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
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

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', file);

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${API_URL}/api/v1/files/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (!res.ok) throw new Error('File upload failed');
      const data = await res.json();
      const fileUrl = data.data?.cloudinaryUrl || data.data?.url || '';

      if (fileUrl) {
        setAttachments((prev) => [...prev, { url: fileUrl, name: file.name }]);
      }
    } catch (err) {
      console.error('[ChatInput] Upload error:', err);
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

  return (
    <div className="relative p-3 border-t border-zinc-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-[#10141e]/50 backdrop-blur-md">
      {/* Pending Attachments Strip */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-500" />
              <span className="truncate max-w-[150px] font-medium">{att.name}</span>
              <button
                onClick={() => removeAttachment(idx)}
                className="hover:text-rose-500 transition-colors ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 right-16 p-2 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xl grid grid-cols-6 gap-1 z-20">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => addEmoji(emoji)}
              className="p-1.5 text-base hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-transform hover:scale-110"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="p-2.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors flex-shrink-0"
          title="Attach file"
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
          ) : (
            <Paperclip className="w-5 h-5" />
          )}
        </button>

        {/* Text Input */}
        <div className="flex-1 relative bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] rounded-2xl focus-within:border-emerald-500/60 transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full bg-transparent px-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none resize-none max-h-32 leading-relaxed"
          />
        </div>

        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors flex-shrink-0"
          title="Insert emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={(!text.trim() && attachments.length === 0) || disabled || isUploading}
          className="p-2.5 rounded-full bg-[#2ecc8f] hover:bg-[#28b881] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white transition-all disabled:opacity-40 disabled:hover:bg-[#2ecc8f] flex-shrink-0 shadow-sm"
          title="Send message (Enter)"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

