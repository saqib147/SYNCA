'use client';

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { Hash, Loader2, MessageSquare, Search } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { useChatNotifications } from '@/context/ChatNotificationContext';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { groupMessages } from '@/lib/chatUtils';

interface ProjectConversationTabProps {
  projectId: string;
  projectName: string;
  canModerate?: boolean;
  members?: Array<{ userId: string; name?: string; email?: string; imageUrl?: string }>;
}

export function ProjectConversationTab({
  projectId,
  projectName,
  canModerate = false,
  members = [],
}: ProjectConversationTabProps) {
  const { userId } = useAuth();
  const { user } = useUser();
  const { setActiveChatKey, markAsRead } = useChatNotifications();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const key = `channel_${projectId}`;
    setActiveChatKey(key);
    markAsRead(key);

    return () => {
      setActiveChatKey(null);
    };
  }, [projectId, setActiveChatKey, markAsRead]);

  const {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMoreMessages,
    sendMessage,
    reactToMessage,
    deleteMessage,
    typingUsers,
    setTyping,
  } = useChat({
    channelType: 'channel',
    channelId: projectId,
  });

  // Auto-scroll only when the newest (bottom) message changes
  useEffect(() => {
    const newest = messages[messages.length - 1];
    const newestId = newest ? String(newest._id || newest.id) : null;
    if (newestId && newestId !== lastMessageIdRef.current) {
      lastMessageIdRef.current = newestId;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const visibleMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) => {
      const text = (m.plainText || (typeof m.content === 'string' ? m.content : '')).toLowerCase();
      const sender = (m.senderName || '').toLowerCase();
      return text.includes(q) || sender.includes(q);
    });
  }, [messages, searchQuery]);

  const groupedList = useMemo(() => {
    return groupMessages(visibleMessages, userId || undefined);
  }, [visibleMessages, userId]);

  const activeMemberIds = useMemo(
    () => new Set(members.map((m) => m.userId)),
    [members]
  );

  const slugChannel = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'general';

  const visibleMembers = members.slice(0, 3);
  const extraMembers = Math.max(0, members.length - 3);

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full rounded-[12px] bg-white dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] overflow-hidden">
      {/* Figma 80:875 Channel Header */}
      <div className="h-[58px] px-5 sm:px-6 border-b border-[#e5e7eb] dark:border-white/[0.08] flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 text-[#006c52] dark:text-[#66deb4] font-['Funnel_Display',sans-serif] font-medium text-[16px] truncate">
            <Hash className="w-4 h-4 shrink-0" />
            <span className="truncate">{slugChannel}</span>
          </div>

          {members.length > 0 && (
            <>
              <span className="h-4 w-[1px] bg-[#bdc9c2] dark:bg-white/[0.12] shrink-0" />
              <div className="flex items-center -space-x-1.5 shrink-0">
                {visibleMembers.map((m) => (
                  <div
                    key={m.userId}
                    title={m.name || m.email || 'Member'}
                    className="size-6 rounded-full ring-2 ring-white dark:ring-[#15171b] bg-[#e7e8e9] dark:bg-zinc-700 text-[10px] font-semibold text-[#191c1d] dark:text-zinc-100 flex items-center justify-center overflow-hidden"
                  >
                    {m.imageUrl ? (
                      <img src={m.imageUrl} alt={m.name || 'Member'} className="size-full object-cover" />
                    ) : (
                      (m.name || 'M').slice(0, 2).toUpperCase()
                    )}
                  </div>
                ))}
                {extraMembers > 0 && (
                  <div className="size-6 rounded-full ring-2 ring-white dark:ring-[#15171b] bg-[#e7e8e9] dark:bg-white/[0.1] text-[10px] font-semibold text-[#3e4944] dark:text-zinc-300 flex items-center justify-center">
                    +{extraMembers}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Soft mint-tinted search input (Figma 80:875) */}
        <div className="relative w-44 sm:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 text-[#3e4944] dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search in #${slugChannel}`}
            className="w-full h-[34px] pl-8 pr-3 rounded-[10px] bg-[#eefaf5] dark:bg-[#006c52]/15 border border-transparent focus:border-[#79deba] text-[12.5px] text-[#191c1d] dark:text-zinc-100 placeholder:text-[#3e4944]/70 dark:placeholder:text-zinc-400 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 px-5 sm:px-7 py-4 overflow-y-auto space-y-0 scrollbar-thin">
        {hasMore && !searchQuery && (
          <div className="flex justify-center pb-2">
            <button
              type="button"
              onClick={loadMoreMessages}
              disabled={isLoadingMore}
              className="px-3.5 py-1.5 rounded-full bg-[#f8f9fa] dark:bg-white/[0.06] hover:bg-[#e7e8e9] dark:hover:bg-white/[0.1] text-[#3e4944] dark:text-zinc-300 text-[12px] font-medium border border-[#e5e7eb] dark:border-white/[0.08] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isLoadingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              <span>Load older messages</span>
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-2 text-[#3e4944] dark:text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#006c52] dark:text-[#66deb4]" />
            <p className="text-[13px]">Loading channel history...</p>
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-2.5 text-[#3e4944] dark:text-zinc-400">
            <div className="size-12 rounded-[14px] bg-[#eefaf5] dark:bg-[#006c52]/20 border border-[#79deba]/50 flex items-center justify-center text-[#006c52] dark:text-[#66deb4]">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="font-['Funnel_Display',sans-serif] text-[17px] font-medium text-[#191c1d] dark:text-white">
              {searchQuery ? 'No messages match your search' : `Welcome to #${slugChannel}`}
            </p>
            <p className="text-[13px] text-[#3e4944] dark:text-zinc-400 max-w-sm">
              {searchQuery
                ? 'Try a different keyword or clear the channel search.'
                : 'Share project updates, attach briefs, or collaborate with your team in real time.'}
            </p>
          </div>
        ) : (
          groupedList.map((item) => {
            const msg = item.message;
            const isOwn = item.isOwn;
            const senderName = isOwn
              ? 'You'
              : msg.senderName || `User ${msg.senderId.slice(-4)}`;
            const senderAvatar = isOwn ? user?.imageUrl : msg.senderAvatar;

            return (
              <React.Fragment key={msg._id || msg.id}>
                {item.showDateDivider && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-[1px] bg-[#e5e7eb] dark:bg-white/[0.08]" />
                    <span className="px-3 py-0.5 rounded-full bg-[#f8f9fa] dark:bg-white/[0.06] text-[11px] font-medium text-[#3e4944] dark:text-zinc-400 border border-[#e5e7eb] dark:border-white/[0.08]">
                      {item.dateLabel}
                    </span>
                    <div className="flex-1 h-[1px] bg-[#e5e7eb] dark:bg-white/[0.08]" />
                  </div>
                )}
                <MessageBubble
                  message={msg}
                  isOwn={isOwn}
                  senderName={senderName}
                  senderAvatar={senderAvatar}
                  isFirstInGroup={item.isFirstInGroup}
                  isLastInGroup={item.isLastInGroup}
                  isFormerMember={
                    members.length > 0 && !activeMemberIds.has(msg.senderId)
                  }
                  onReact={(emoji) => reactToMessage(msg._id || msg.id || '', emoji)}
                  onDelete={() => deleteMessage(msg._id || msg.id || '')}
                  canDelete={isOwn || canModerate}
                  variant="channel"
                />
              </React.Fragment>
            );
          })
        )}

        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-[12px] text-[#006c52] dark:text-[#79deba] italic pl-11">
            <span className="size-2 rounded-full bg-[#66deb4] animate-pulse" />
            <span>
              {typingUsers.map((u) => u.name || 'Someone').join(', ')} is typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Mint-Tinted Composer Footer (Figma 80:875) */}
      <div className="px-5 sm:px-6 pb-4 pt-2 bg-white dark:bg-[#15171b]">
        <div className="rounded-[12px] border border-[#a7e9d2] dark:border-[#66deb4]/30 bg-[#f4fdf9] dark:bg-[#121a18] overflow-hidden">
          <ChatInput
            onSend={sendMessage}
            onTyping={setTyping}
            placeholder={`Message #${slugChannel}`}
            projectId={projectId}
            variant="channel"
          />
        </div>
        <p className="text-center text-[11px] text-[#3e4944]/70 dark:text-zinc-500 mt-1.5">
          Return to send • Shift + Return for new line
        </p>
      </div>
    </div>
  );
}
