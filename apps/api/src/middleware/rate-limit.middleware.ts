import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../lib/redis.js';

interface RateLimitOptions {
  windowSeconds: number;
  maxRequests: number;
  keyPrefix: string;
}

// In-memory fallback map when Redis is unavailable
const memoryBuckets = new Map<string, { count: number; expiresAt: number }>();

export function createRateLimiter({ windowSeconds, maxRequests, keyPrefix }: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).auth?.userId || req.ip || 'anon';
    const key = `rl:${keyPrefix}:${userId}`;

    try {
      if (redisClient.isOpen) {
        const count = await redisClient.incr(key);
        if (count === 1) {
          await redisClient.expire(key, windowSeconds);
        }
        if (count > maxRequests) {
          return res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests. Please try again shortly.',
            },
          });
        }
        return next();
      }
    } catch {
      // Fall through to in-memory limiter if Redis errors
    }

    const now = Date.now();
    const entry = memoryBuckets.get(key);
    if (!entry || entry.expiresAt <= now) {
      memoryBuckets.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
      return next();
    }

    entry.count += 1;
    if (entry.count > maxRequests) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again shortly.',
        },
      });
    }

    return next();
  };
}
