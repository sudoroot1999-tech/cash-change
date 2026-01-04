import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DeviceFingerprintService } from '../services/device-fingerprint.service';

@Injectable()
export class DeviceFingerprintMiddleware implements NestMiddleware {
  constructor(
    private readonly deviceService: DeviceFingerprintService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Generate fingerprint from request
    const fingerprint = this.deviceService.generateFingerprint({
      userAgent: req.headers['user-agent'] || '',
      acceptLanguage: req.headers['accept-language'],
      acceptEncoding: req.headers['accept-encoding'],
      ipAddress: req.ip || '',
    });

    // Attach to request
    (req as any).deviceFingerprint = fingerprint;

    next();
  }
}
