import './loadEnv.js';
import http from 'http';
import { createApp } from './app.js';
import { connectMongoDB } from './lib/mongodb.js';
import { connectRedis } from './lib/redis.js';
import { createSocketServer } from './socket/index.js';

const PORT = process.env.PORT || 4000;
const app = createApp();

const startServer = async () => {
  try {
    await connectMongoDB();
    await connectRedis();

    const httpServer = http.createServer(app);
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
