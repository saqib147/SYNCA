import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { clerkMiddleware } from '@clerk/express';
import { requireAuth } from './middleware/auth.middleware.js';
import { redisClient } from './lib/redis.js';
import fileRouter from './routes/file.routes.js';
import workspaceRouter from './routes/workspace.routes.js';

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
  app.use(express.json());
  app.use(
    clerkMiddleware({
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
      secretKey: process.env.CLERK_SECRET_KEY,
    })
  );

  // Register API routers
  app.use('/api/v1/files', fileRouter);
  app.use('/api/v1/workspaces', workspaceRouter);

  app.get('/health', async (_req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

    let redisStatus = 'disconnected';
    if (redisClient.isOpen) {
      try {
        await redisClient.ping();
        redisStatus = 'connected';
      } catch (err) {
        console.error('[HealthCheck] Redis ping failed:', err);
      }
    }

    const isHealthy = dbStatus === 'connected' && redisStatus === 'connected';

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'synca-api',
      uptime: process.uptime(),
      connections: {
        mongodb: dbStatus,
        redis: redisStatus,
      },
    });
  });

  // Protected route for testing / verifying authorization middleware
  app.get('/api/v1/protected-test', requireAuth, (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        message: 'You have accessed the protected route!',
        userId: (req as any).auth.userId,
      },
    });
  });

  return app;
};
