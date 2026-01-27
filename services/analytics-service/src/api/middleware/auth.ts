import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../../utils/logger';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No authorization token provided',
      });
      return;
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'your-jwt-secret-key';

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    req.user = decoded;

    logger.debug(`Authenticated user: ${decoded.userId}`);
    next();
  } catch (error) {
    logger.error('Authentication failed', error);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
    return;
  }
  next();
};
