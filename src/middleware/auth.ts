import { Request, Response, NextFunction } from 'express';
import { verifyAuthToken } from '../utils/authToken.js';

export interface AuthenticatedRequest extends Request {
  userId?: number;
  username?: string;
  userEmail?: string;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();

  try {
    const payload = verifyAuthToken(token);
    req.userId = payload.userId;
    req.username = payload.username;
    req.userEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired session token' });
  }
}
