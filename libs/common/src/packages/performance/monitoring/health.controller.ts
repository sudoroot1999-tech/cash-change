import { Controller, Get } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('health')
export class HealthController {
  constructor(private metricsService: MetricsService) {}

  @Get()
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  @Get('metrics')
  async metrics() {
    return await this.metricsService.getMetrics();
  }

  @Get('ready')
  async readiness() {
    // Add checks for database, redis, etc.
    return {
      status: 'ready',
      checks: {
        database: 'ok',
        redis: 'ok',
        queue: 'ok',
      },
    };
  }

  @Get('live')
  async liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}
