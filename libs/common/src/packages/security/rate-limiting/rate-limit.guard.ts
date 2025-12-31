import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RateLimiterService } from './rate-limiter.service';
import { RATE_LIMIT_KEY, RateLimitOptions } from './rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private reflector: Reflector,
    private rateLimiter: RateLimiterService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitOptions = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!rateLimitOptions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const identifier = this.getIdentifier(request, rateLimitOptions);

    const result = await this.rateLimiter.checkRateLimit(identifier, {
      windowMs: rateLimitOptions.windowMs,
      maxRequests: rateLimitOptions.maxRequests,
      blockDurationMs: rateLimitOptions.blockDurationMs,
      keyPrefix: rateLimitOptions.keyPrefix,
    });

    // Set rate limit headers
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', rateLimitOptions.maxRequests);
    response.setHeader('X-RateLimit-Remaining', result.remaining);
    response.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      response.setHeader('Retry-After', Math.ceil((result.retryAfter || 0) / 1000));
      
      this.logger.warn(
        `Rate limit exceeded for ${identifier} on ${request.path}`,
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests, please try again later',
          retryAfter: result.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private getIdentifier(request: Request, options: RateLimitOptions): string {
    // Use user ID if authenticated
    if ((request as any).user?.id) {
      return `user:${(request as any).user.id}`;
    }

    // Use API key if present
    const apiKey = request.headers['x-api-key'] as string;
    if (apiKey) {
      return `apikey:${apiKey}`;
    }

    // Fall back to IP address
    const ip = this.getClientIp(request);
    return `ip:${ip}`;
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    const realIp = request.headers['x-real-ip'] as string;
    if (realIp) {
      return realIp;
    }

    return request.ip || request.socket.remoteAddress || 'unknown';
  }
}
