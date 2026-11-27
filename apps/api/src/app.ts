import './loadEnv.js';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import mongoose from 'mongoose';
import { clerkMiddleware } from '@clerk/express';
import { redisClient } from './lib/redis.js';
import fileRouter from './routes/file.routes.js';
import projectRouter from './routes/project.routes.js';
import taskRouter from './routes/task.routes.js';
import messageRouter from './routes/message.routes.js';
import userRouter from './routes/user.routes.js';

export const getAllowedOrigins = (): string[] => {
  const raw = process.env.CLIENT_URL || 'http://localhost:3000';
  return raw
    .split(',')
    .map((u) => u.trim().replace(/\/+$/, ''))
    .filter(Boolean);
};

export const isOriginAllowed = (origin?: string): boolean => {
  // Allow server-to-server / health probes with no Origin header
  if (!origin) return true;
  const normalized = origin.replace(/\/+$/, '');
  const allowed = getAllowedOrigins();
  if (allowed.includes(normalized) || allowed.includes('*')) return true;
  // Allow localhost in dev and Vercel production/preview deployments
  if (normalized === 'http://localhost:3000' || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalized)) {
    return true;
  }
  return false;
};

export const createApp = () => {
  const app = express();

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  };

  app.set('trust proxy', 1);
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // Fast health probe (registered before clerkMiddleware so Render/keep-alive pings skip auth & extra RTTs)
  app.get('/health', (_req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';
    const redisStatus = redisClient.isReady ? 'connected' : redisClient.isOpen ? 'connecting' : 'disconnected';

    const isHealthy = dbStatus === 'connected';
    const overallStatus =
      dbStatus === 'connected' && redisStatus === 'connected'
        ? 'healthy'
        : isHealthy
          ? 'degraded'
          : 'unhealthy';

    res.status(isHealthy ? 200 : 503).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: 'synca-api',
      uptime: process.uptime(),
      connections: {
        mongodb: dbStatus,
        redis: redisStatus,
      },
    });
  });

  app.use(express.json());
  app.use(
    clerkMiddleware({
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
      secretKey: process.env.CLERK_SECRET_KEY,
    })
  );

  // Register API routers
  app.use('/api/v1/files', fileRouter);
  app.use('/api/v1/projects', projectRouter);
  app.use('/api/v1/tasks', taskRouter);
  app.use('/api/v1/messages', messageRouter);
  app.use('/api/v1/users', userRouter);

  // Global error handler (handles Multer errors & unexpected exceptions cleanly as JSON)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({
        success: false,
        error: {
          code: err.code,
          message:
            err.code === 'LIMIT_FILE_SIZE'
              ? 'File exceeds maximum allowed size limit'
              : err.message,
        },
      });
    }
    console.error('[Synca API] Unhandled error:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected server error occurred',
      },
    });
  });

  return app;
};
