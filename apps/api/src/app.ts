import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'synca-api',
      uptime: process.uptime(),
    });
  });

  return app;
};
