import http from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { Express } from 'express';
import { socketAuthMiddleware } from './socketAuth.js';
import { registerSocketHandlers } from './handlers.js';

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
      const pubClient = createClient({ url: redisUrl });
      const subClient = pubClient.duplicate();
      pubClient.on('error', (err) => console.error('[Socket Redis Pub]', err.message));
      subClient.on('error', (err) => console.error('[Socket Redis Sub]', err.message));
      await Promise.all([pubClient.connect(), subClient.connect()]);
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

  return io;
}
