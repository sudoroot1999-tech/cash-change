import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import * as crypto from 'crypto';
import { RequestContext } from '../../../types';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Apply Helmet security headers
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: 'deny',
      },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
      hidePoweredBy: true
    })(req, res, () => { });

    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Remove identifying headers
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    next();
  }
}

@Injectable()
export class CSRFMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Skip CSRF check for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Skip for API key authentication
    if (req.headers['x-api-key']) {
      return next();
    }

    const csrfToken = req.headers['x-csrf-token'] as string;
    const sessionToken = (req as any).session?.csrfToken;

    if (!csrfToken || csrfToken !== sessionToken) {
      return res.status(403).json({
        statusCode: 403,
        message: 'Invalid CSRF token',
      });
    }

    next();
  }
}

@Injectable()
export class CORSMiddleware implements NestMiddleware {
  private allowedOrigins: string[];

  constructor() {
    this.allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
  }

  use(req: Request, res: Response, next: NextFunction) {
    const origin = req.headers.origin;

    if (origin && this.allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-API-Key');
      res.setHeader('Access-Control-Max-Age', '86400');
    }

    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    next();
  }
}

@Injectable()
export class DeviceFingerprintMiddleware implements NestMiddleware {

  async use(req: Request, res: Response, next: NextFunction) {
    // Generate fingerprint from request

    const hash = crypto.createHash('sha256');
    hash.update(req.headers['user-agent']);
    if (req.headers['accept-language']) hash.update(req.headers['accept-language']);
    if (req.headers['accept-encoding']) hash.update(req.headers['accept-encoding']);
    hash.update(req.ip);

    const fingerprint = hash.digest('hex');

    // Attach to request
    (req as any).deviceFingerprint = fingerprint;

    next();
  }
}

@Injectable()
export class DeviceContextMiddleware implements NestMiddleware {
  use(req: Request & { context?: RequestContext }, _: Response, next: NextFunction) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress || '127.0.0.1';

    req.context = {
      fingerprint: (req as any).deviceFingerprint,
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
      language: req.headers['accept-language'],
    };

    next();
  }
}

