import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(zlib.gzip);
const brotliCompressAsync = promisify(zlib.brotliCompress);

@Injectable()
export class CompressionInterceptor implements NestInterceptor {
  private readonly minSize = 1024; // Don't compress responses smaller than 1KB

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();
    const acceptEncoding = request.headers['accept-encoding'] || '';

    return next.handle().pipe(
      map(async (data) => {
        // Skip compression for small responses
        const dataStr = JSON.stringify(data);
        if (dataStr.length < this.minSize) {
          return data;
        }

        // Determine compression method
        const supportsBrotli = acceptEncoding.includes('br');
        const supportsGzip = acceptEncoding.includes('gzip');

        if (!supportsBrotli && !supportsGzip) {
          return data;
        }

        // Compress with brotli (better compression) or gzip
        const buffer = Buffer.from(dataStr);
        let compressed: Buffer;
        let encoding: string;

        if (supportsBrotli) {
          compressed = await brotliCompressAsync(buffer, {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: 4, // Balance between speed and compression
            },
          });
          encoding = 'br';
        } else {
          compressed = await gzipAsync(buffer, {
            level: zlib.constants.Z_BEST_SPEED,
          });
          encoding = 'gzip';
        }

        // Set headers
        response.setHeader('Content-Encoding', encoding);
        response.setHeader('Content-Length', compressed.length);
        response.setHeader('Vary', 'Accept-Encoding');

        return compressed;
      }),
    );
  }
}
