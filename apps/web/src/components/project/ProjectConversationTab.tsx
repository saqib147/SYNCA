'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { Hash, Loader2, MessageSquare, Wifi, WifiOff } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { useSocket } from '@/context/SocketContext';
import { useChatNotifications } from '@/context/ChatNotificationContext';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { groupMessages } from '@/lib/chatUtils';

interface ProjectConversationTabProps {
  projectId: string;
  projectName: string;
}

export function ProjectConversationTab({ projectId, projectName }: ProjectConversationTabProps) {
  const { userId } = useAuth();
  const { user } = useUser();
  const { isConnected } = useSocket();
  const { setActiveChatKey, markAsRead } = useChatNotifications();
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const groupedList = useMemo(() => {
    return groupMessages(messages, userId || undefined);
  }, [messages, userId]);

  return (
    <div className="flex flex-col h-[650px] bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl rounded-3xl border border-zinc-200/80 dark:border-white/[0.08] shadow-sm overflow-hidden transition-colors">
      {/* Channel Header */}
      <div className="h-14 px-6 border-b border-zinc-200/80 dark:border-white/[0.08] flex items-center justify-between bg-zinc-50/50 dark:bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Hash className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>{projectName} — #general</span>
            </h3>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
              Project channel for all team members
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px]">
          {isConnected ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <Wifi className="w-3 h-3 inline" /> Real-time connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-500">
              <WifiOff className="w-3 h-3 inline" /> Connecting...
            </span>
          )}
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4 scrollbar-thin">
        {hasMore && (
          <div className="flex justify-center pb-2">
            <button
              onClick={loadMoreMessages}
              disabled={isLoadingMore}
              className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              {isLoadingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              <span>Load older messages</span>
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-2 text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            <p className="text-xs">Loading channel history...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-2 text-zinc-400">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Welcome to #{projectName} channel!</p>
            <p className="text-xs text-zinc-400 max-w-sm">
              This is the start of the project discussion. Send updates, attach deliverables, or ask questions.
            </p>
          </div>
        ) : (
          groupedList.map((item) => {
            const msg = item.message;
            const isOwn = item.isOwn;
            const senderName = isOwn ? 'You' : msg.senderName || `User ${msg.senderId.slice(-4)}`;
            const senderAvatar = isOwn ? user?.imageUrl : msg.senderAvatar;

            return (
              <React.Fragment key={msg._id || msg.id}>
                {item.showDateDivider && (
                  <div className="flex items-center justify-center my-3">
                    <span className="px-3 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 border border-zinc-200/80 dark:border-white/[0.08] shadow-2xs">
                      {item.dateLabel}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={msg}
                  isOwn={isOwn}
                  senderName={senderName}
                  senderAvatar={senderAvatar}
                  isFirstInGroup={item.isFirstInGroup}
                  isLastInGroup={item.isLastInGroup}
                  onReact={(emoji) => reactToMessage(msg._id || msg.id || '', emoji)}
                  onDelete={() => deleteMessage(msg._id || msg.id || '')}
                  canDelete={isOwn}
                />
              </React.Fragment>
            );
          })
        )}

        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 italic pl-11">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{typingUsers.map((u) => u.name || 'Someone').join(', ')} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onTyping={setTyping}
        placeholder={`Message #${projectName}...`}
      />
    </div>
  );
}

