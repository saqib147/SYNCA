'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/nextjs';
import { Message, Reaction } from '@synca/types';

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

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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
      return;
    }

    let isMounted = true;

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
          if (isMounted) setIsConnected(true);
        });

        s.on('disconnect', () => {
          if (isMounted) setIsConnected(false);
        });

        s.on('connect_error', async (err) => {
          // If token expired, attempt refresh
          if (err.message.includes('Authentication') || err.message.includes('token')) {
            try {
              const freshToken = await getToken({ skipCache: true });
              if (freshToken && s) {
                s.auth = { token: `Bearer ${freshToken}` };
                s.connect();
              }
            } catch {
              /* ignore */
            }
          }
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

