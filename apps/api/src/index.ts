import './loadEnv.js';
import http from 'http';
import { createApp } from './app.js';
import { connectMongoDB, closeMongoDB } from './lib/mongodb.js';
import { connectRedis, closeRedis } from './lib/redis.js';
import { createSocketServer, closeSocketServer } from './socket/index.js';

const PORT = process.env.PORT || 4000;
const app = createApp();

let httpServerRef: http.Server | null = null;
let isShuttingDown = false;

const shutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[Synca API] Received ${signal}, shutting down gracefully...`);

  try {
    await closeSocketServer();
    if (httpServerRef) {
      await new Promise<void>((resolve) => httpServerRef!.close(() => resolve()));
    }
    await closeRedis();
    await closeMongoDB();
    process.exit(0);
  } catch (err) {
    console.error('[Synca API] Error during graceful shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

const startServer = async () => {
  try {
    await connectMongoDB();
    await connectRedis();

    const httpServer = http.createServer(app);
    httpServerRef = httpServer;
    await createSocketServer(httpServer, app);

    httpServer.listen(PORT, () => {
      console.log(`[Synca API] Server + Socket.io running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Synca API] Failed to start server due to startup error:', error);
    process.exit(1);
  }
};

startServer();
