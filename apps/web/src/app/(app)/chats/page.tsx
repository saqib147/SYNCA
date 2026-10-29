'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import {
  Phone,
  Video,
  MoreVertical,
  Hash,
  MessageSquare,
  Loader2,
  ArrowLeft,
  Wifi,
  WifiOff,
  Users,
} from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useSocket } from '@/context/SocketContext';
import { useChatNotifications } from '@/context/ChatNotificationContext';
import { useChat } from '@/hooks/useChat';
import { ChatSidebar, ConversationTarget } from '@/components/chat/ChatSidebar';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { ContactProfileDrawer } from '@/components/chat/ContactProfileDrawer';
import { groupMessages } from '@/lib/chatUtils';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// Shared chat stream (used in both modes)
// ─────────────────────────────────────────────
function ChatStream({ target }: { target: ConversationTarget }) {
  const { userId } = useAuth();
  const { user } = useUser();
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  } = useChat({ channelType: target.type, channelId: target.id });

  const { setActiveChatKey, markAsRead } = useChatNotifications();

  useEffect(() => {
    const key = target.type === 'channel' ? `channel_${target.id}` : `dm_${target.id}`;
    setActiveChatKey(key);
    markAsRead(key);
    return () => setActiveChatKey(null);
  }, [target.id, target.type, setActiveChatKey, markAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const groupedList = useMemo(() => groupMessages(messages, userId || undefined), [messages, userId]);

  return (
    <>
      {/* Message Stream */}
      <div className="flex-1 px-6 py-4 overflow-y-auto space-y-1 scrollbar-thin">
        {hasMore && (
          <div className="flex justify-center pb-2">
            <button
              onClick={loadMoreMessages}
              disabled={isLoadingMore}
              className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              {isLoadingMore && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>Load older messages</span>
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-2 text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            <p className="text-xs">Loading conversation…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-3 text-zinc-400">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No messages yet</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                {target.type === 'dm'
                  ? `Send ${target.name} a message to start the conversation.`
                  : 'Be the first to send a message in this channel.'}
              </p>
            </div>
          </div>
        ) : (
          groupedList.map((item) => {
            const msg = item.message;
            const isOwn = item.isOwn;
            const senderDisplayName = isOwn
              ? 'You'
              : msg.senderName || (target.type === 'dm' ? target.name : `User ${msg.senderId.slice(-4)}`);
            const senderAvatar = isOwn ? user?.imageUrl : msg.senderAvatar || target.avatarUrl;

            return (
              <React.Fragment key={msg._id || msg.id}>
                {item.showDateDivider && (
                  <div className="flex items-center justify-center my-3">
                    <span className="px-3 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 border border-zinc-200/80 dark:border-white/[0.08]">
                      {item.dateLabel}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={msg}
                  isOwn={isOwn}
                  senderName={senderDisplayName}
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
          <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 italic pl-11 pt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{typingUsers.map((u) => u.name || 'Someone').join(', ')} is typing…</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onTyping={setTyping}
        placeholder={`Message ${target.name}…`}
      />
    </>
  );
}

// ─────────────────────────────────────────────
// DM mode — full-width, no Hub sidebar
// ─────────────────────────────────────────────
function DirectChatView({ peerId, peerName }: { peerId: string; peerName: string }) {
  const router = useRouter();
  const { isConnected } = useSocket();
  const { onlineUsers } = useSocket();
  const isOnline = Boolean(onlineUsers[peerId]);

  const target: ConversationTarget = {
    type: 'dm',
    id: peerId,
    name: peerName,
    subtitle: isOnline ? 'Active now' : 'Offline',
    isOnline,
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl rounded-3xl border border-zinc-200/80 dark:border-white/[0.08] shadow-sm overflow-hidden">
      {/* Main chat column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 px-4 border-b border-zinc-200/80 dark:border-white/[0.08] flex items-center justify-between bg-white/60 dark:bg-white/[0.02] backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Back button */}
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-sky-500 flex items-center justify-center font-bold text-sm text-white shadow-sm overflow-hidden">
                {target.avatarUrl ? (
                  <img src={target.avatarUrl} alt={peerName} className="w-full h-full object-cover" />
                ) : (
                  peerName.charAt(0).toUpperCase()
                )}
              </div>
              <span
                className={cn(
                  'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#10141e]',
                  isOnline ? 'bg-emerald-500' : 'bg-zinc-400'
                )}
              />
            </div>

            {/* Name & status */}
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{peerName}</h2>
              <div className="flex items-center gap-1 text-[11px]">
                {isConnected ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Wifi className="w-3 h-3" />
                    {isOnline ? 'Active now' : 'Real-time active'}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-500">
                    <WifiOff className="w-3 h-3" /> Connecting…
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 flex-shrink-0">
            <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <Phone className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <Video className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stream + Input */}
        <ChatStream target={target} />
      </div>

      {/* Right: Contact profile panel */}
      <ContactProfileDrawer target={target} />
    </div>
  );
}

// ─────────────────────────────────────────────
// Hub mode — Messages Hub with full ChatSidebar
// ─────────────────────────────────────────────
function MessagesHubView() {
  const { userId } = useAuth();
  const { projects, isLoading: isProjectsLoading } = useProjects();
  const { isConnected } = useSocket();

  const [activeTarget, setActiveTarget] = useState<ConversationTarget | null>(null);

  // Default to first project channel on load
  useEffect(() => {
    if (activeTarget) return;
    if (projects.length > 0) {
      const firstProj = projects[0];
      setActiveTarget({
        type: 'channel',
        id: String(firstProj._id),
        name: `${firstProj.name} — #general`,
        subtitle: firstProj.description || 'Project Channel',
      });
    }
  }, [projects, isProjectsLoading, activeTarget]);

  const activeProject =
    activeTarget?.type === 'channel'
      ? projects.find((p) => String(p._id) === activeTarget?.id) || null
      : null;

  return (
    <div className="flex h-[calc(100vh-6rem)] bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl rounded-3xl border border-zinc-200/80 dark:border-white/[0.08] shadow-sm overflow-hidden">
      {/* Left: Hub sidebar */}
      <ChatSidebar
        projects={projects}
        activeTarget={activeTarget}
        onSelectTarget={setActiveTarget}
        currentUserId={userId || undefined}
      />

      {/* Center: Chat area */}
      {activeTarget ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="h-16 px-6 border-b border-zinc-200/80 dark:border-white/[0.08] flex items-center justify-between bg-white/60 dark:bg-white/[0.02] backdrop-blur-md flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {activeTarget.type === 'channel' ? (
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                  <Hash className="w-4 h-4" />
                </div>
              ) : (
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-xs overflow-hidden">
                    {activeTarget.avatarUrl ? (
                      <img src={activeTarget.avatarUrl} alt={activeTarget.name} className="w-full h-full object-cover" />
                    ) : (
                      activeTarget.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span
                    className={cn(
                      'absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white dark:border-zinc-900',
                      activeTarget.isOnline ? 'bg-emerald-500' : 'bg-zinc-400'
                    )}
                  />
                </div>
              )}

              <div className="min-w-0">
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {activeTarget.name}
                </h2>
                <div className="flex items-center gap-1 text-[11px]">
                  {isConnected ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Wifi className="w-3 h-3" /> Real-time active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-500">
                      <WifiOff className="w-3 h-3" /> Connecting…
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 flex-shrink-0">
              <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                <Phone className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                <Video className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          <ChatStream target={activeTarget} />
        </div>
      ) : (
        /* Empty state when no conversation selected */
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Users className="w-8 h-8" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Select a conversation</p>
            <p className="text-xs mt-1">Choose a channel or teammate from the sidebar</p>
          </div>
        </div>
      )}

      {/* Right: Profile/details panel */}
      {activeTarget && (
        <ContactProfileDrawer target={activeTarget} project={activeProject} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Page router — decides which view to render
// ─────────────────────────────────────────────
function ChatsContent() {
  const searchParams = useSearchParams();
  const dmParam = searchParams.get('dm');
  const nameParam = searchParams.get('name');

  // Direct DM link from sidebar → full-screen chat, no Hub
  if (dmParam) {
    return (
      <DirectChatView
        peerId={dmParam}
        peerName={nameParam || 'Teammate'}
      />
    );
  }

  // No specific target → Messages Hub
  return <MessagesHubView />;
}

export default function ChatsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-6rem)]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <ChatsContent />
    </Suspense>
  );
}
