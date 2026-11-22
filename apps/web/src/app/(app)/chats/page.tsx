'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import {
  MessageSquare,
  Loader2,
  AlertCircle,
  Search,
  PanelRight,
  X,
  Plus,
  Trash2,
} from 'lucide-react';
import { useTeammates, upsertDmPeerLocally } from '@/hooks/useTeammates';
import { useSocket } from '@/context/SocketContext';
import { useChatNotifications } from '@/context/ChatNotificationContext';
import { useChat } from '@/hooks/useChat';
import { ConversationTarget } from '@/components/chat/ChatSidebar';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { ContactProfileDrawer } from '@/components/chat/ContactProfileDrawer';
import { NewMessageModal } from '@/components/chat/NewMessageModal';
import { groupMessages } from '@/lib/chatUtils';
import { Message } from '@synca/types';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// DM Chat Stream
// ─────────────────────────────────────────────
function ChatStream({
  target,
  searchQuery = '',
  onMessagesLoaded,
}: {
  target: ConversationTarget;
  searchQuery?: string;
  onMessagesLoaded?: (msgs: Message[]) => void;
}) {
  const { userId } = useAuth();
  const { user } = useUser();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

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
  } = useChat({ channelType: 'dm', channelId: target.id });

  const { setActiveChatKey, markAsRead } = useChatNotifications();

  useEffect(() => {
    lastMessageIdRef.current = null;
    const key = `dm_${target.id}`;
    setActiveChatKey(key);
    markAsRead(key);
    return () => setActiveChatKey(null);
  }, [target.id, setActiveChatKey, markAsRead]);

  useEffect(() => {
    onMessagesLoaded?.(messages);
  }, [messages, onMessagesLoaded]);

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
      const text = (
        m.plainText || (typeof m.content === 'string' ? m.content : '')
      ).toLowerCase();
      return text.includes(q);
    });
  }, [messages, searchQuery]);

  const groupedList = useMemo(
    () => groupMessages(visibleMessages, userId || undefined),
    [visibleMessages, userId]
  );

  return (
    <>
      <div className="flex-1 px-6 sm:px-8 py-5 overflow-y-auto space-y-1 scrollbar-thin">
        {hasMore && !searchQuery && (
          <div className="flex justify-center pb-3">
            <button
              type="button"
              onClick={loadMoreMessages}
              disabled={isLoadingMore}
              className="px-3.5 py-1.5 rounded-full bg-[#f8f9fa] dark:bg-white/[0.06] hover:bg-[#e7e8e9] dark:hover:bg-white/[0.1] text-[#3e4944] dark:text-zinc-300 text-[12px] font-medium border border-[#e5e7eb] dark:border-white/[0.08] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isLoadingMore && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>Load older messages</span>
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-56 space-y-2.5 text-[#3e4944] dark:text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#006c52] dark:text-[#66deb4]" />
            <p className="text-[13px]">Loading conversation…</p>
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 text-center space-y-3">
            <div className="size-14 rounded-[16px] bg-[#eefaf5] dark:bg-[#006c52]/20 border border-[#79deba]/50 flex items-center justify-center text-[#006c52] dark:text-[#66deb4]">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div>
              <p className="font-['Funnel_Display',sans-serif] text-[18px] font-medium text-[#191c1d] dark:text-white">
                {searchQuery ? 'No matching messages' : 'Say hello!'}
              </p>
              <p className="text-[13px] text-[#3e4944] dark:text-zinc-400 mt-1 max-w-xs">
                {searchQuery
                  ? 'Try another keyword or clear the search bar.'
                  : `Send ${target.name} a message to start your 1:1 conversation.`}
              </p>
            </div>
          </div>
        ) : (
          groupedList.map((item) => {
            const msg = item.message;
            const isOwn = item.isOwn;
            const senderDisplayName = isOwn
              ? 'You'
              : msg.senderName || target.name;
            const senderAvatar = isOwn
              ? user?.imageUrl
              : msg.senderAvatar || target.avatarUrl;

            return (
              <React.Fragment key={msg._id || msg.id}>
                {item.showDateDivider && (
                  <div className="flex items-center justify-center my-5">
                    <span className="px-3.5 py-1 rounded-full bg-[#f1f3f4] dark:bg-white/[0.07] text-[11.5px] font-medium text-[#3e4944] dark:text-zinc-400">
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
                  onReact={(emoji) =>
                    reactToMessage(msg._id || msg.id || '', emoji)
                  }
                  onDelete={() => deleteMessage(msg._id || msg.id || '')}
                  canDelete={isOwn}
                  variant="dm"
                />
              </React.Fragment>
            );
          })
        )}

        {/* Animated 3-dot Typing Indicator Bubble (Figma 86:330) */}
        {typingUsers.length > 0 && (
          <div className="flex items-end gap-2.5 mt-4">
            <div className="size-8 rounded-full bg-[#e7e8e9] dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold text-[#191c1d] dark:text-zinc-200 overflow-hidden shrink-0">
              {target.avatarUrl ? (
                <img
                  src={target.avatarUrl}
                  alt={target.name}
                  className="size-full object-cover"
                />
              ) : (
                (typingUsers[0]?.name || target.name).charAt(0).toUpperCase()
              )}
            </div>
            <div className="px-4 py-3 rounded-[14px] rounded-bl-[4px] bg-[#f1f3f4] dark:bg-[#1e2127] inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-[#3e4944]/50 dark:bg-zinc-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="size-1.5 rounded-full bg-[#3e4944]/50 dark:bg-zinc-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="size-1.5 rounded-full bg-[#3e4944]/50 dark:bg-zinc-400 animate-bounce" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        onSend={async (content, attachments) => {
          upsertDmPeerLocally(userId, {
            userId: target.id,
            name: target.name,
            avatarUrl: target.avatarUrl,
            lastMessagePreview: content || (attachments.length > 0 ? 'Attachment' : ''),
            lastMessageAt: new Date().toISOString(),
          });
          await sendMessage(content, attachments);
        }}
        onTyping={setTyping}
        placeholder={`Message ${target.name}...`}
        variant="dm"
      />
    </>
  );
}

// ─────────────────────────────────────────────
// Direct DM View — Figma 86:330 & 86:890 (No duplicate sidebar!)
// ─────────────────────────────────────────────
function DirectChatView({
  peerId,
  peerName,
  peerAvatar,
}: {
  peerId: string;
  peerName?: string;
  peerAvatar?: string;
}) {
  const router = useRouter();
  const { getToken } = useAuth();
  const { onlineUsers } = useSocket();
  const { teammates, deleteConversation } = useTeammates();
  const isOnline = Boolean(onlineUsers[peerId]);

  const [showProfile, setShowProfile] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const peerTeammate = teammates.find((t) => t.userId === peerId);
  const [profile, setProfile] = useState<{
    name: string;
    avatarUrl: string;
  } | null>(null);

  useEffect(() => {
    setProfile(null);
    setSearchQuery('');
    if (peerTeammate?.name || (peerName && peerName !== 'Teammate')) return;
    let mounted = true;
    (async () => {
      try {
        const token = await getToken();
        const res = await window.fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/users/${peerId}/profile`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const body = await res.json();
          if (mounted && body.data) {
            setProfile({
              name: body.data.name,
              avatarUrl: body.data.avatarUrl,
            });
          }
        }
      } catch (err) {
        console.error('[DirectChatView] fetchProfile error:', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [peerId, peerTeammate?.name, getToken]);

  const resolvedName =
    peerTeammate?.name ||
    profile?.name ||
    (peerName && peerName !== 'Teammate' ? peerName : '') ||
    'Direct Message';

  const resolvedAvatar =
    peerTeammate?.avatarUrl || profile?.avatarUrl || peerAvatar || undefined;

  const target: ConversationTarget = {
    type: 'dm',
    id: peerId,
    name: resolvedName,
    avatarUrl: resolvedAvatar,
    subtitle: isOnline ? 'Active now' : 'Offline',
    isOnline,
  };

  const handleDeleteCurrentDm = async () => {
    if (
      !window.confirm(
        `Delete conversation with ${resolvedName}? All messages in this DM will be removed.`
      )
    ) {
      return;
    }
    try {
      await deleteConversation(peerId);
      router.replace('/chats');
    } catch (err) {
      console.error('[DirectChatView] Failed to delete conversation:', err);
    }
  };

  const openSearch = () => {
    setShowSearch(true);
    setTimeout(() => searchInputRef.current?.focus(), 40);
  };

  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* Main Chat Card (Figma 86:330) */}
      <div className="flex-1 flex flex-col min-w-0 rounded-[20px] bg-white dark:bg-[#111316] border border-[#e5e5e5] dark:border-white/[0.08] overflow-hidden">
        {/* Header */}
        <div className="h-[64px] px-6 border-b border-[#e5e7eb] dark:border-white/[0.08] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            <h2 className="font-['Funnel_Display',sans-serif] font-medium text-[20px] text-[#191c1d] dark:text-white truncate">
              {target.name}
            </h2>
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[#3e4944] dark:text-zinc-400">
              <span
                className={cn(
                  'size-2 rounded-full',
                  isOnline ? 'bg-[#66deb4]' : 'bg-zinc-400'
                )}
              />
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </span>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {showSearch ? (
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-[#3e4944] dark:text-zinc-400 absolute left-3 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages..."
                  className="w-44 sm:w-56 h-[34px] pl-8 pr-7 rounded-[8px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#bdc9c2] dark:border-white/[0.12] text-[12.5px] text-[#191c1d] dark:text-white focus:outline-none focus:border-[#006c52] dark:focus:border-[#66deb4]"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setShowSearch(false);
                  }}
                  className="absolute right-2 p-0.5 text-[#3e4944] hover:text-[#191c1d] dark:text-zinc-400 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={openSearch}
                title="Search in conversation"
                className="p-2 rounded-[8px] text-[#3e4944] dark:text-zinc-400 hover:bg-[#f3f3f3] dark:hover:bg-white/[0.08] hover:text-[#191c1d] dark:hover:text-white transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleDeleteCurrentDm}
              title="Delete conversation"
              className="p-2 rounded-[8px] text-[#3e4944] dark:text-zinc-400 hover:bg-[#ffdad6]/60 dark:hover:bg-rose-500/15 hover:text-[#ba1a1a] dark:hover:text-rose-400 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowProfile((v) => !v)}
              title={showProfile ? 'Hide profile' : 'Show profile'}
              className={cn(
                'p-2 rounded-[8px] transition-colors cursor-pointer',
                showProfile
                  ? 'bg-[#eefaf5] dark:bg-[#006c52]/25 text-[#006c52] dark:text-[#66deb4]'
                  : 'text-[#3e4944] dark:text-zinc-400 hover:bg-[#f3f3f3] dark:hover:bg-white/[0.08]'
              )}
            >
              <PanelRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stream + Input */}
        <ChatStream
          target={target}
          searchQuery={searchQuery}
          onMessagesLoaded={setLiveMessages}
        />
      </div>

      {/* Detached Right Profile Card (Figma 86:890) */}
      {showProfile && (
        <div className="hidden xl:block">
          <ContactProfileDrawer
            target={target}
            sharedProjects={peerTeammate?.sharedProjects || []}
            messages={liveMessages}
            onSearchClick={openSearch}
            onDeleteConversation={handleDeleteCurrentDm}
            onClose={() => setShowProfile(false)}
            detached
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Empty / Default Landing View when /chats has no ?dm=
// Auto-opens most recent conversation if one exists, otherwise shows onboarding CTA
// ─────────────────────────────────────────────
function EmptyChatsView() {
  const { teammates, isLoading } = useTeammates();
  const [showNewMessage, setShowNewMessage] = useState(false);

  if (isLoading && teammates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full rounded-[20px] bg-white dark:bg-[#111316] border border-[#e5e5e5] dark:border-white/[0.08] gap-2.5 text-[#3e4944] dark:text-zinc-400">
        <Loader2 className="w-6 h-6 animate-spin text-[#006c52] dark:text-[#66deb4]" />
        <p className="text-[13px]">Loading conversations…</p>
      </div>
    );
  }

  // WhatsApp-style: automatically open the most recent conversation if available
  if (teammates.length > 0) {
    const mostRecent = teammates[0];
    return (
      <DirectChatView
        peerId={mostRecent.userId}
        peerName={mostRecent.name}
        peerAvatar={mostRecent.avatarUrl}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center h-full rounded-[20px] bg-white dark:bg-[#111316] border border-[#e5e5e5] dark:border-white/[0.08] p-8 text-center space-y-4">
        <div className="size-14 rounded-[16px] bg-[#eefaf5] dark:bg-[#006c52]/20 border border-[#79deba]/50 flex items-center justify-center text-[#006c52] dark:text-[#66deb4]">
          <MessageSquare className="w-7 h-7" />
        </div>
        <div>
          <h2 className="font-['Funnel_Display',sans-serif] text-[22px] font-medium text-[#191c1d] dark:text-white">
            No conversations yet
          </h2>
          <p className="text-[13.5px] text-[#3e4944] dark:text-zinc-400 mt-1 max-w-sm">
            Click the <strong>+</strong> button in the sidebar or start a new conversation below using a teammate&apos;s name or exact email.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewMessage(true)}
          className="px-4 py-2.5 rounded-[8px] bg-[#006c52] hover:bg-[#005742] dark:bg-[#66deb4] dark:hover:bg-[#52d1a4] text-white dark:text-[#111316] text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Start New Conversation</span>
        </button>
      </div>

      <NewMessageModal
        isOpen={showNewMessage}
        onClose={() => setShowNewMessage(false)}
      />
    </>
  );
}

// ─────────────────────────────────────────────
// Tier 3 Email Lookup resolver (direct URL support)
// ─────────────────────────────────────────────
function EmailLookupView({ email }: { email: string }) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [status, setStatus] = useState<'loading' | 'not_found' | 'error'>(
    'loading'
  );
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let mounted = true;
    setStatus('loading');
    (async () => {
      try {
        const token = await getToken();
        const apiBase =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await window.fetch(
          `${apiBase}/api/v1/users/lookup?email=${encodeURIComponent(email)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const body = await res.json().catch(() => ({}));
        if (!mounted) return;
        if (res.ok && body.data?.userId) {
          router.replace(
            `/chats?dm=${body.data.userId}&name=${encodeURIComponent(body.data.name || '')}&avatar=${encodeURIComponent(body.data.avatarUrl || '')}`
          );
          return;
        }
        setErrorMsg(
          body?.error?.message || `No Synca user found for "${email}".`
        );
        setStatus('not_found');
      } catch {
        if (!mounted) return;
        setErrorMsg('Failed to look up user. Please try again.');
        setStatus('error');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [email, getToken, router]);

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-2rem)] rounded-[20px] bg-white dark:bg-[#111316] border border-[#e5e5e5] dark:border-white/[0.08] p-8 text-center gap-4">
      {status === 'loading' ? (
        <>
          <Loader2 className="w-7 h-7 animate-spin text-[#006c52] dark:text-[#66deb4]" />
          <p className="text-[14px] text-[#3e4944] dark:text-zinc-400">
            Looking up {email}…
          </p>
        </>
      ) : (
        <>
          <div className="size-14 rounded-[16px] bg-[#ffdad6] dark:bg-rose-500/15 flex items-center justify-center text-[#ba1a1a] dark:text-rose-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-['Funnel_Display',sans-serif] text-[20px] font-medium text-[#191c1d] dark:text-white">
              User not found
            </h2>
            <p className="text-[13.5px] text-[#3e4944] dark:text-zinc-400 mt-1 max-w-sm">
              {errorMsg}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.replace('/chats')}
            className="px-4 py-2.5 rounded-[8px] bg-[#191c1d] dark:bg-white text-white dark:text-[#191c1d] text-[13px] font-semibold cursor-pointer"
          >
            Back to Chats
          </button>
        </>
      )}
    </div>
  );
}

function ChatsContent() {
  const searchParams = useSearchParams();
  const dmParam = searchParams.get('dm');
  const nameParam = searchParams.get('name');
  const avatarParam = searchParams.get('avatar');
  const emailParam = searchParams.get('email');

  if (emailParam) {
    return <EmailLookupView email={emailParam} />;
  }

  if (dmParam) {
    return (
      <DirectChatView
        peerId={dmParam}
        peerName={nameParam || undefined}
        peerAvatar={avatarParam || undefined}
      />
    );
  }

  return <EmptyChatsView />;
}

export default function ChatsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-7 h-7 animate-spin text-[#006c52] dark:text-[#66deb4]" />
        </div>
      }
    >
      <ChatsContent />
    </Suspense>
  );
}
