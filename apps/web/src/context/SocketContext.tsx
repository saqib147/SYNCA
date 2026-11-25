'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/nextjs';
import { Message, Reaction } from '@synca/types';
import { SOCKET_URL } from '@/lib/env';

interface PresenceData {
  userId: string;
  status: 'online' | 'offline';
  lastSeen?: Date | string;
}

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Record<string, boolean>; // userId -> isOnline
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  onlineUsers: {},
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      setOnlineUsers({});
      return;
    }

    let isMounted = true;
    let authRetryCount = 0;

    const initSocket = async () => {
      try {
        const token = await getToken();
        if (!token || !isMounted) return;

        const s = io(SOCKET_URL, {
          auth: {
            token: `Bearer ${token}`,
          },
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socketRef.current = s;
        setSocket(s);

        s.on('connect', () => {
          authRetryCount = 0;
          if (isMounted) setIsConnected(true);
        });

        s.on('disconnect', () => {
          if (isMounted) setIsConnected(false);
        });

        s.on('connect_error', async (err) => {
          if (!isMounted || authRetryCount >= 3) return;
          // If token expired, attempt refresh (capped at 3 retries)
          if (err.message.includes('Authentication') || err.message.includes('token')) {
            authRetryCount += 1;
            try {
              const freshToken = await getToken({ skipCache: true });
              if (freshToken && isMounted && socketRef.current === s) {
                s.auth = { token: `Bearer ${freshToken}` };
                s.connect();
              }
            } catch {
              /* ignore */
            }
          }
        });

        s.on('presence:sync', (payload: { onlineUserIds: string[] }) => {
          if (!isMounted || !Array.isArray(payload?.onlineUserIds)) return;
          setOnlineUsers((prev) => {
            const next = { ...prev };
            for (const uid of payload.onlineUserIds) {
              next[uid] = true;
            }
            return next;
          });
        });

        s.on('presence:update', (payload: PresenceData) => {
          if (!isMounted) return;
          setOnlineUsers((prev) => ({
            ...prev,
            [payload.userId]: payload.status === 'online',
          }));
        });
      } catch (err) {
        console.warn('[SocketProvider] Connection failed:', err);
      }
    };

    initSocket();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isLoaded, isSignedIn, getToken]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}

