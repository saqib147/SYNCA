'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { Message, Reaction } from '@synca/types';
import { useSocket } from '@/context/SocketContext';
import { notifyDmUpdated } from '@/hooks/useTeammates';
import {
  getChannelMessages,
  getDmMessages,
  sendMessageApi,
  deleteMessageApi,
} from '@/lib/api/message.api';

interface UseChatProps {
  channelType: 'channel' | 'dm';
  channelId: string; // projectId for channel, peerUserId for dm
}

// Per-conversation message cache so switching rooms/DMs is instant (0ms) and socket connect never wipes state
const chatMessagesCache = new Map<string, { messages: Message[]; nextCursor: string | null }>();

export function useChat({ channelType, channelId }: UseChatProps) {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const { socket, isConnected } = useSocket();

  const cacheKey = `${channelType}:${channelId}`;

  const [messages, setMessagesState] = useState<Message[]>(() =>
    channelId && chatMessagesCache.has(cacheKey) ? chatMessagesCache.get(cacheKey)!.messages : []
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !(channelId && chatMessagesCache.has(cacheKey))
  );
  const [nextCursor, setNextCursor] = useState<string | null>(() =>
    channelId && chatMessagesCache.has(cacheKey) ? chatMessagesCache.get(cacheKey)!.nextCursor : null
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ userId: string; name: string }[]>([]);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingEmitRef = useRef<number>(0);

  // Sync both React state and per-conversation cache
  const setMessages = useCallback(
    (updater: React.SetStateAction<Message[]>) => {
      setMessagesState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (channelId) {
          const existing = chatMessagesCache.get(cacheKey);
          chatMessagesCache.set(cacheKey, {
            messages: next,
            nextCursor: existing?.nextCursor ?? null,
          });
        }
        return next;
      });
    },
    [channelId, cacheKey]
  );

  // Compute canonical socket room channelId for DMs
  const effectiveChannelId = useCallback(() => {
    if (channelType === 'channel') return channelId;
    if (!userId || !channelId) return '';
    return [userId, channelId].sort().join(':');
  }, [channelType, channelId, userId]);

  // Load initial messages (decoupled from socket lifecycle — never double-fetches on connect)
  const loadInitialMessages = useCallback(async () => {
    if (!channelId) return;
    const cached = chatMessagesCache.get(cacheKey);
    if (cached) {
      setMessagesState(cached.messages);
      setNextCursor(cached.nextCursor);
      setIsLoading(false);
    } else {
      setMessagesState([]);
      setNextCursor(null);
      setIsLoading(true);
    }

    try {
      const token = await getToken();
      let res;
      if (channelType === 'channel') {
        res = await getChannelMessages(channelId, token, { limit: 50 });
      } else {
        res = await getDmMessages(channelId, token, { limit: 50 });
      }
      const loaded = res.messages || [];
      const cursor = res.nextCursor || null;
      chatMessagesCache.set(cacheKey, { messages: loaded, nextCursor: cursor });
      setMessagesState(loaded);
      setNextCursor(cursor);
    } catch (err) {
      console.error('[useChat] Failed to load messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [channelType, channelId, cacheKey, getToken]);

  // Load older messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!nextCursor || isLoadingMore || !channelId) return;
    setIsLoadingMore(true);
    try {
      const token = await getToken();
      let res;
      if (channelType === 'channel') {
        res = await getChannelMessages(channelId, token, { cursor: nextCursor, limit: 50 });
      } else {
        res = await getDmMessages(channelId, token, { cursor: nextCursor, limit: 50 });
      }
      const older = res.messages || [];
      const cursor = res.nextCursor || null;
      setMessagesState((prev) => {
        const merged = [...older, ...prev];
        chatMessagesCache.set(cacheKey, { messages: merged, nextCursor: cursor });
        return merged;
      });
      setNextCursor(cursor);
    } catch (err) {
      console.error('[useChat] Failed to load older messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [channelType, channelId, cacheKey, nextCursor, isLoadingMore, getToken]);

  // Effect 1: HTTP initial load when switching channel/DM (independent of socket connection)
  useEffect(() => {
    setTypingUsers([]);
    loadInitialMessages();
  }, [loadInitialMessages]);

  // Effect 2: Socket room join & live event listeners (never clears or refetches messages)
  useEffect(() => {
    if (!socket || !channelId) return;

    const currentChannel = effectiveChannelId();

    if (channelType === 'channel') {
      socket.emit('project:join', { projectId: channelId });
    } else {
      socket.emit('dm:join', { targetUserId: channelId });
    }

    const handleNewMessage = (msg: Message) => {
      // Check if message belongs to this conversation
      const isForThisChannel =
        channelType === 'channel'
          ? msg.channelType === 'channel' && String(msg.projectId || msg.channelId) === String(channelId)
          : msg.channelType === 'dm' && msg.channelId === currentChannel;

      if (isForThisChannel) {
        setMessages((prev) => {
          // If this is from the current user, replace the matching temporary optimistic message
          if (userId && msg.senderId === userId) {
            const tempIdx = prev.findIndex(
              (m) =>
                String(m._id || m.id).startsWith('temp-') &&
                m.senderId === userId
            );
            if (tempIdx !== -1) {
              const updated = [...prev];
              updated[tempIdx] = msg;
              return updated;
            }
          }

          // Avoid duplicate insertion
          const exists = prev.some((m) => (m._id || m.id) === (msg._id || msg.id));
          if (exists) return prev;
          return [...prev, msg];
        });
      }
    };

    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => (m._id || m.id) !== messageId));
    };

    const handleMessageReaction = ({
      messageId,
      reactions,
    }: {
      messageId: string;
      reactions: Reaction[];
    }) => {
      setMessages((prev) =>
        prev.map((m) =>
          (m._id || m.id) === messageId ? { ...m, reactions } : m
        )
      );
    };

    const handleTypingUpdate = ({
      channelId: tChannelId,
      typingUsers: users,
    }: {
      channelId: string;
      typingUsers: { userId: string; name: string }[];
    }) => {
      if (tChannelId === currentChannel || tChannelId === channelId) {
        setTypingUsers((users || []).filter((u) => u.userId !== userId));
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('message:reaction', handleMessageReaction);
    socket.on('typing:update', handleTypingUpdate);

    return () => {
      // Do NOT emit project:leave on unmount — the socket must remain subscribed to
      // joined project rooms so global unread badges & toasts keep firing on other pages.
      if (channelType === 'dm') {
        socket.emit('dm:leave', { targetUserId: channelId });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      socket.off('message:new', handleNewMessage);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('message:reaction', handleMessageReaction);
      socket.off('typing:update', handleTypingUpdate);
    };
  }, [channelType, channelId, socket, effectiveChannelId, userId, setMessages]);

  // Send message
  const sendMessage = useCallback(
    async (content: string, attachments: string[] = []) => {
      if (!content.trim() && attachments.length === 0) return;
      if (!channelId || !userId) return;

      const currentChannel = effectiveChannelId();
      const clientChannelId = channelType === 'channel' ? channelId : currentChannel;

      // Optimistic temporary message
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: Message = {
        _id: tempId,
        id: tempId,
        channelType,
        channelId: clientChannelId,
        projectId: channelType === 'channel' ? channelId : null,
        senderId: userId,
        senderName: user?.fullName || user?.firstName || 'You',
        senderAvatar: user?.imageUrl || '',
        content: content.trim(),
        plainText: content.trim(),
        attachments,
        reactions: [],
        mentions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      // Emit typing stop
      if (socket) {
        socket.emit('typing:stop', { channelType, channelId: clientChannelId });
      }

      const resolvedSenderName = user?.fullName || user?.firstName || undefined;
      const resolvedSenderAvatar = user?.imageUrl || undefined;

      try {
        if (socket && isConnected) {
          socket.emit(
            'message:send',
            {
              channelType,
              channelId: clientChannelId,
              content: content.trim(),
              attachments,
            },
            (ack?: { ok: boolean; error?: string }) => {
              if (ack && !ack.ok) {
                console.error('[useChat] Socket send rejected:', ack.error);
                setMessages((prev) => prev.filter((m) => m._id !== tempId));
              } else if (channelType === 'dm') {
                notifyDmUpdated();
              }
            }
          );
        } else {
          // REST Fallback
          const token = await getToken();
          const sent = await sendMessageApi(
            {
              channelType,
              channelId: clientChannelId,
              content: content.trim(),
              attachments,
            },
            token
          );
          setMessages((prev) =>
            prev.map((m) => (m._id === tempId ? sent : m))
          );
        }
      } catch (err) {
        console.error('[useChat] Failed to send message:', err);
        // Rollback optimistic
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
      }
    },
    [channelId, channelType, effectiveChannelId, isConnected, socket, userId, user, getToken]
  );

  // Send reaction (optimistic UI toggle before server broadcast)
  const reactToMessage = useCallback(
    (messageId: string, emoji: string) => {
      if (!socket || !isConnected || !userId) return;

      setMessages((prev) =>
        prev.map((m) => {
          if ((m._id || m.id) !== messageId) return m;
          const current = m.reactions || [];
          const existing = current.find((r) => r.emoji === emoji);
          let nextReactions: Reaction[];
          if (existing) {
            const hasReacted = existing.userIds.includes(userId);
            const nextUsers = hasReacted
              ? existing.userIds.filter((u) => u !== userId)
              : [...existing.userIds, userId];
            nextReactions =
              nextUsers.length === 0
                ? current.filter((r) => r.emoji !== emoji)
                : current.map((r) =>
                    r.emoji === emoji ? { ...r, userIds: nextUsers } : r
                  );
          } else {
            nextReactions = [...current, { emoji, userIds: [userId] }];
          }
          return { ...m, reactions: nextReactions };
        })
      );

      socket.emit('message:react', { messageId, emoji });
    },
    [socket, isConnected, userId, setMessages]
  );

  // Delete message (optimistic UI removal with rollback on REST failure)
  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!messageId) return;
      const previous = messages;
      setMessages((prev) => prev.filter((m) => (m._id || m.id) !== messageId));

      try {
        if (socket && isConnected) {
          socket.emit('message:delete', { messageId });
        } else {
          const token = await getToken();
          await deleteMessageApi(messageId, token);
        }
      } catch (err) {
        console.error('[useChat] Failed to delete message:', err);
        setMessages(previous);
      }
    },
    [socket, isConnected, getToken, messages, setMessages]
  );

  // Send typing indicators (throttled: emits typing:start at most once every 2s)
  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!socket || !isConnected || !channelId) return;
      const clientChannelId = channelType === 'channel' ? channelId : effectiveChannelId();

      if (isTyping) {
        const now = Date.now();
        if (now - lastTypingEmitRef.current >= 2000) {
          lastTypingEmitRef.current = now;
          socket.emit('typing:start', { channelType, channelId: clientChannelId });
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          lastTypingEmitRef.current = 0;
          socket.emit('typing:stop', { channelType, channelId: clientChannelId });
        }, 3000);
      } else {
        lastTypingEmitRef.current = 0;
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        socket.emit('typing:stop', { channelType, channelId: clientChannelId });
      }
    },
    [channelId, channelType, effectiveChannelId, isConnected, socket]
  );

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore: Boolean(nextCursor),
    loadMoreMessages,
    sendMessage,
    reactToMessage,
    deleteMessage,
    typingUsers,
    setTyping,
  };
}

