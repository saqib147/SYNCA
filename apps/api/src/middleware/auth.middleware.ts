import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';

export interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
    sessionId?: string;
    [key: string]: any;
  };
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = getAuth(req);

    if (!auth || !auth.userId) {
      const debugData = typeof (auth as any)?.debug === 'function' ? (auth as any).debug() : null;
      console.warn('[requireAuth] 401 Unauthorized:', {
        method: req.method,
        url: req.originalUrl,
        hasAuth: Boolean(auth),
        userId: auth?.userId || null,
        hasAuthHeader: Boolean(req.headers.authorization),
        reason: debugData?.reason || 'unauthenticated',
        message: debugData?.message || 'Missing or expired Clerk session token',
      });

      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: debugData?.message || 'Missing or expired Clerk session token',
        },
      });
    }

    // Attach resolved properties to req.auth so controllers can access (req as any).auth.userId
    if (typeof (req as any).auth === 'function') {
      Object.assign((req as any).auth, auth);
    } else {
      (req as any).auth = auth;
    }

    next();
  } catch (err: any) {
    console.error('[requireAuth] Unexpected error during authentication:', err);
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: err?.message || 'Missing or expired Clerk session token',
      },
    });
  }
};
