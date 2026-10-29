import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  throw new Error('Please define the REDIS_URL environment variable in .env or .env.local');
}

// Create the Redis client instance with a capped reconnect strategy to prevent log flooding
export const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 5) {
        console.error('[Redis] Max reconnection attempts reached (5). Stopping auto-reconnect.');
        return new Error('Redis max reconnection attempts exceeded');
      }
      return Math.min(retries * 500, 3000);
    },
  },
});

// Setup event monitoring
redisClient.on('connect', () => {
  console.log('[Redis] Connecting to server...');
});

redisClient.on('ready', () => {
  console.log('[Redis] Client connected successfully and ready for commands');
});

redisClient.on('error', (err) => {
  console.error('[Redis] Client connection error:', err);
});

redisClient.on('end', () => {
  console.log('[Redis] Connection closed');
});

// Helper function to connect
export const connectRedis = async () => {
  if (redisClient.isOpen) {
    return redisClient;
  }

  try {
    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('[Redis] Connection initialization failed:', error);
    throw error;
  }
};

// Graceful shutdown helper
const gracefulShutdown = async () => {
  if (redisClient.isOpen) {
    try {
      await redisClient.quit();
      console.log('[Redis] Connection pool closed gracefully');
    } catch (err) {
      console.error('[Redis] Error closing connection pool:', err);
    }
  }
};

// Listen for termination signals to close resources
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
