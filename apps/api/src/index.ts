import './loadEnv.js';
import { createApp } from './app.js';
import { connectMongoDB } from './lib/mongodb.js';
import { connectRedis } from './lib/redis.js';

const PORT = process.env.PORT || 4000;
const app = createApp();

const startServer = async () => {
  try {
    // Establish connection pools before accepting traffic
    await connectMongoDB();
    await connectRedis();

    app.listen(PORT, () => {
      console.log(`[Synca API] Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Synca API] Failed to start server due to startup error:', error);
    process.exit(1);
  }
};

startServer();
