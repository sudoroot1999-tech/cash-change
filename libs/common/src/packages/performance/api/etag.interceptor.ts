import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as crypto from 'crypto';

/**
 * ETag interceptor for conditional requests
 * Returns 304 Not Modified if content hasn't changed
 */
@Injectable()
export class ETagInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    return next.handle().pipe(
      map((data) => {
        // Generate ETag from response data
        const content = JSON.stringify(data);
        const etag = this.generateETag(content);

        // Set ETag header
        response.setHeader('ETag', etag);
        response.setHeader('Cache-Control', 'private, must-revalidate');

        // Check if client's ETag matches
        const clientETag = request.headers['if-none-match'];
        if (clientETag === etag) {
          response.status(304);
          return null; // Don't send body for 304
        }

        return data;
      }),
    );
  }

  private generateETag(content: string): string {
    return `"${crypto.createHash('md5').update(content).digest('hex')}"`;
  }
}
