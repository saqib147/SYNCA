import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
    sessionId: string;
    // Add other fields as needed
  };
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const auth = (req as any).auth;

  if (!auth || !auth.userId) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or expired Clerk session token',
      },
    });
  }

  next();
};
