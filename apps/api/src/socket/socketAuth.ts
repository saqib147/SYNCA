import { Socket } from 'socket.io';
import { verifyToken } from '@clerk/express';

/**
 * Authenticate Socket.io handshake with Clerk session JWT
 * (`socket.handshake.auth.token` or `Authorization` header).
 */
export async function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  try {
    const raw =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization ||
      '';

    const token = String(raw).replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return next(new Error('Authentication token missing'));
    }

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      return next(new Error('Server auth misconfigured'));
    }

    const payload = await verifyToken(token, { secretKey });
    if (!payload?.sub) {
      return next(new Error('Invalid authentication token'));
    }

    socket.data.userId = payload.sub;
    next();
  } catch (err: any) {
    console.warn('[socketAuth] Rejected connection:', err?.message || err);
    next(new Error('Invalid authentication token'));
  }
}
