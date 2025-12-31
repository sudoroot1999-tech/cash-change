import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

/**
 * APM (Application Performance Monitoring) Interceptor
 * Automatically tracks all HTTP requests
 */
@Injectable()
export class APMInterceptor implements NestInterceptor {
  private readonly logger = new Logger(APMInterceptor.name);

  constructor(private metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();
    
    const { method, url, route } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (Date.now() - startTime) / 1000;
          const statusCode = response.statusCode;
          const routePath = route?.path || url;

          this.metricsService.recordHttpRequest(
            method,
            routePath,
            statusCode,
            duration,
          );

          // Log slow requests
          if (duration > 1) {
            this.logger.warn(
              `Slow request: ${method} ${routePath} took ${duration.toFixed(3)}s`,
            );
          }
        },
        error: (error) => {
          const duration = (Date.now() - startTime) / 1000;
          const routePath = route?.path || url;
          const errorType = error.constructor.name;

          this.metricsService.recordHttpError(method, routePath, errorType);
          this.metricsService.recordHttpRequest(
            method,
            routePath,
            error.status || 500,
            duration,
          );
        },
      }),
    );
  }
}
