'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Message } from '@synca/types';
import { useSocket } from './SocketContext';
import { useProjects } from '@/hooks/useProjects';
import { Hash, MessageSquare, X, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChatToastItem {
  id: string;
  key: string;
  title: string;
  subtitle: string;
  content: string;
  avatarUrl?: string;
  isChannel: boolean;
  linkHref: string;
}

interface ChatNotificationContextValue {
  unreadCounts: Record<string, number>;
  activeChatKey: string | null;
  setActiveChatKey: (key: string | null) => void;
  markAsRead: (key: string) => void;
  totalUnreadCount: number;
}

const ChatNotificationContext = createContext<ChatNotificationContextValue>({
  unreadCounts: {},
  activeChatKey: null,
  setActiveChatKey: () => {},
  markAsRead: () => {},
  totalUnreadCount: 0,
});

export const useChatNotifications = () => useContext(ChatNotificationContext);

function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    /* ignore browser audio autoplay restrictions */
  }
}

export function ChatNotificationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { userId } = useAuth();
  const { socket } = useSocket();
  const { projects } = useProjects();

  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [activeChatKey, setActiveChatKey] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ChatToastItem[]>([]);

  const activeChatKeyRef = useRef<string | null>(activeChatKey);
  useEffect(() => {
    activeChatKeyRef.current = activeChatKey;
  }, [activeChatKey]);

  const projectsRef = useRef(projects);
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  const markAsRead = useCallback((key: string) => {
    setUnreadCounts((prev) => {
      if (!prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  }, []);

  // When window regains focus, clear unread for currently active conversation
  useEffect(() => {
    const handleFocus = () => {
      if (activeChatKeyRef.current) {
        markAsRead(activeChatKeyRef.current);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [markAsRead]);

  const totalUnreadCount = Object.values(unreadCounts).reduce((acc, count) => acc + count, 0);

  // Synchronize browser tab title with unread count
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const baseTitle = 'Synca — Collaborative Workspace Platform';
    if (totalUnreadCount > 0) {
      document.title = `(${totalUnreadCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [totalUnreadCount]);

  // Global socket listener for new messages
  useEffect(() => {
    if (!socket || !userId) return;

    const handleNewMessage = (msg: Message) => {
      // Don't notify for our own messages
      if (msg.senderId === userId) return;

      const isChannel = msg.channelType === 'channel';
      const channelTargetId = String(msg.projectId || msg.channelId);
      const conversationKey = isChannel ? `channel_${channelTargetId}` : `dm_${msg.senderId}`;

      // Check if user is actively focused on this window and this conversation
      const currentActive = activeChatKeyRef.current;
      const hasFocus = typeof document !== 'undefined' && document.hasFocus() && !document.hidden;
      const isActivelyViewing = currentActive === conversationKey && hasFocus;

      if (!isActivelyViewing) {
        // Increment unread count
        setUnreadCounts((prev) => ({
          ...prev,
          [conversationKey]: (prev[conversationKey] || 0) + 1,
        }));

        // Play gentle audio chime
        playNotificationChime();

        // Lookup project name if channel
        let title = msg.senderName || 'Direct Message';
        let subtitle = 'Direct Message';
        let linkHref = `/chats?dm=${msg.senderId}${msg.senderName ? `&name=${encodeURIComponent(msg.senderName)}` : ''}${msg.senderAvatar ? `&avatar=${encodeURIComponent(msg.senderAvatar)}` : ''}`;

        if (isChannel) {
          const foundProj = projectsRef.current.find((p) => String(p._id) === channelTargetId);
          const projName = foundProj?.name || 'Project';
          title = `#${projName}`;
          subtitle = msg.senderName ? `${msg.senderName} in #general` : 'New message in #general';
          linkHref = `/projects/${channelTargetId}?tab=conversation`;
        }

        const toastId = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newToast: ChatToastItem = {
          id: toastId,
          key: conversationKey,
          title,
          subtitle,
          content: msg.plainText || (typeof msg.content === 'string' ? msg.content : 'New attachment shared'),
          avatarUrl: msg.senderAvatar,
          isChannel,
          linkHref,
        };

        setToasts((prev) => [...prev.slice(-3), newToast]);

        // Auto-dismiss after 6 seconds
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toastId));
        }, 6000);
      }
    };

    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, [socket, userId]);

  const handleToastClick = (toast: ChatToastItem) => {
    markAsRead(toast.key);
    setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    router.push(toast.linkHref);
  };

  const handleDismissToast = (e: React.MouseEvent, toastId: string) => {
    e.stopPropagation();
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  };

  return (
    <ChatNotificationContext.Provider
      value={{
        unreadCounts,
        activeChatKey,
        setActiveChatKey,
        markAsRead,
        totalUnreadCount,
      }}
    >
      {children}

      {/* Floating Top-Right Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              onClick={() => handleToastClick(toast)}
              className="pointer-events-auto group relative flex items-start gap-3 p-3.5 rounded-2xl bg-white/95 dark:bg-[#10141e]/95 backdrop-blur-xl border border-zinc-200/90 dark:border-white/[0.12] shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 cursor-pointer transition-all animate-in slide-in-from-top-4 duration-300"
            >
              {/* Avatar or Channel Icon */}
              <div className="relative flex-shrink-0 mt-0.5">
                {toast.isChannel ? (
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <Hash className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex items-center justify-center font-bold text-xs text-zinc-800 dark:text-zinc-200 shadow-sm border border-white dark:border-zinc-800">
                    {toast.avatarUrl ? (
                      <img src={toast.avatarUrl} alt={toast.title} className="w-full h-full object-cover" />
                    ) : (
                      <span>{toast.title.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                )}
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
              </div>

              {/* Notification Details */}
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{toast.title}</h4>
                  <span className="text-[10px] text-zinc-400 font-medium">now</span>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium truncate">{toast.subtitle}</p>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1 line-clamp-2 leading-snug">
                  {toast.content}
                </p>
              </div>

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={(e) => handleDismissToast(e, toast.id)}
                className="absolute top-2.5 right-2.5 p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </ChatNotificationContext.Provider>
  );
}
