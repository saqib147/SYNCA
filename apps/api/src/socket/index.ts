import http from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, RedisClientType } from 'redis';
import { Express } from 'express';
import { socketAuthMiddleware } from './socketAuth.js';
import { registerSocketHandlers } from './handlers.js';

let ioInstance: Server | null = null;
let pubClientRef: RedisClientType | null = null;
let subClientRef: RedisClientType | null = null;

export function getIO(): Server | null {
  return ioInstance;
}

/** Join all live sockets of a user to a project room (e.g. after creating, joining, or being added to a project). */
export async function joinUserToProjectRoom(userId: string, projectId: string) {
  if (!ioInstance) return;
  try {
    const sockets = await ioInstance.in(`user:${userId}`).fetchSockets();
    for (const s of sockets) {
      s.join(`project:${projectId}`);
    }
  } catch (err) {
    console.error('[Socket.io] Failed to join user to project room:', err);
  }
}

/** Evict all live sockets of a user from a project room (e.g. after member removal). */
export async function evictUserFromProjectRoom(userId: string, projectId: string) {
  if (!ioInstance) return;
  try {
    const sockets = await ioInstance.in(`user:${userId}`).fetchSockets();
    for (const s of sockets) {
      s.leave(`project:${projectId}`);
    }
  } catch (err) {
    console.error('[Socket.io] Failed to evict user from project room:', err);
  }
}

export async function closeSocketServer() {
  try {
    if (ioInstance) {
      await new Promise<void>((resolve) => ioInstance!.close(() => resolve()));
      ioInstance = null;
    }
    if (pubClientRef?.isOpen) await pubClientRef.quit();
    if (subClientRef?.isOpen) await subClientRef.quit();
  } catch (err) {
    console.error('[Socket.io] Error during socket shutdown:', err);
  }
}

export async function createSocketServer(httpServer: http.Server, _app: Express) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Multi-instance adapter (optional — skip if Redis pub/sub clients fail)
  try {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      const reconnectStrategy = (retries: number) => {
        if (retries > 5) return new Error('Socket Redis max retries exceeded');
        return Math.min(retries * 500, 3000);
      };
      const pubClient = createClient({ url: redisUrl, socket: { reconnectStrategy } });
      const subClient = pubClient.duplicate();
      pubClient.on('error', (err) => console.error('[Socket Redis Pub]', err.message));
      subClient.on('error', (err) => console.error('[Socket Redis Sub]', err.message));
      await Promise.all([pubClient.connect(), subClient.connect()]);
      pubClientRef = pubClient as RedisClientType;
      subClientRef = subClient as RedisClientType;
      io.adapter(createAdapter(pubClient, subClient));
      console.log('[Socket.io] Redis adapter attached');
    }
  } catch (err) {
    console.warn('[Socket.io] Redis adapter unavailable — running single-node only:', err);
  }

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Connected user=${socket.data.userId} id=${socket.id}`);
    registerSocketHandlers(io, socket);
  });

  ioInstance = io;
  return io;
}
