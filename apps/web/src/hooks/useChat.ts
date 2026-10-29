'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { Message, Reaction } from '@synca/types';
import { useSocket } from '@/context/SocketContext';
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

export function useChat({ channelType, channelId }: UseChatProps) {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const { socket, isConnected } = useSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ userId: string; name: string }[]>([]);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Compute canonical socket room channelId for DMs
  const effectiveChannelId = useCallback(() => {
    if (channelType === 'channel') return channelId;
    if (!userId || !channelId) return '';
    return [userId, channelId].sort().join(':');
  }, [channelType, channelId, userId]);

  // Load initial messages
  const loadInitialMessages = useCallback(async () => {
    if (!channelId) return;
    setIsLoading(true);
    try {
      const token = await getToken();
      let res;
      if (channelType === 'channel') {
        res = await getChannelMessages(channelId, token, { limit: 50 });
      } else {
        res = await getDmMessages(channelId, token, { limit: 50 });
      }
      setMessages(res.messages || []);
      setNextCursor(res.nextCursor || null);
    } catch (err) {
      console.error('[useChat] Failed to load messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [channelType, channelId, getToken]);

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
      setMessages((prev) => [...(res.messages || []), ...prev]);
      setNextCursor(res.nextCursor || null);
    } catch (err) {
      console.error('[useChat] Failed to load older messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [channelType, channelId, nextCursor, isLoadingMore, getToken]);

  // Room join/leave and event listeners
  useEffect(() => {
    loadInitialMessages();

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
      if (channelType === 'channel') {
        socket.emit('project:leave', { projectId: channelId });
      } else {
        socket.emit('dm:leave', { targetUserId: channelId });
      }
      socket.off('message:new', handleNewMessage);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('message:reaction', handleMessageReaction);
      socket.off('typing:update', handleTypingUpdate);
    };
  }, [channelType, channelId, socket, effectiveChannelId, loadInitialMessages, userId]);

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
          socket.emit('message:send', {
            channelType,
            channelId: clientChannelId,
            content: content.trim(),
            attachments,
            senderName: resolvedSenderName,
            senderAvatar: resolvedSenderAvatar,
          });
        } else {
          // REST Fallback
          const token = await getToken();
          const sent = await sendMessageApi(
            {
              channelType,
              channelId: clientChannelId,
              content: content.trim(),
              attachments,
              senderName: resolvedSenderName,
              senderAvatar: resolvedSenderAvatar,
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

  // Send reaction
  const reactToMessage = useCallback(
    (messageId: string, emoji: string) => {
      if (!socket || !isConnected) return;
      socket.emit('message:react', { messageId, emoji });
    },
    [socket, isConnected]
  );

  // Delete message
  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!messageId) return;
      try {
        if (socket && isConnected) {
          socket.emit('message:delete', { messageId });
        } else {
          const token = await getToken();
          await deleteMessageApi(messageId, token);
          setMessages((prev) => prev.filter((m) => (m._id || m.id) !== messageId));
        }
      } catch (err) {
        console.error('[useChat] Failed to delete message:', err);
      }
    },
    [socket, isConnected, getToken]
  );

  // Send typing indicators
  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!socket || !isConnected || !channelId) return;
      const clientChannelId = channelType === 'channel' ? channelId : effectiveChannelId();

      if (isTyping) {
        socket.emit('typing:start', { channelType, channelId: clientChannelId });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('typing:stop', { channelType, channelId: clientChannelId });
        }, 3000);
      } else {
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

