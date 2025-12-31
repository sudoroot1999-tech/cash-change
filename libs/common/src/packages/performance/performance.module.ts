import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MultiLayerCacheService } from './cache/multi-layer-cache.service';
import { DataLoaderService } from './api/dataloader.service';
import { QueueService } from './jobs/queue.service';
import { MetricsService } from './monitoring/metrics.service';
import { HealthController } from './monitoring/health.controller';
import { CompressionInterceptor } from './api/compression.interceptor';
import { ETagInterceptor } from './api/etag.interceptor';
import { APMInterceptor } from './monitoring/apm.interceptor';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    MultiLayerCacheService,
    DataLoaderService,
    QueueService,
    MetricsService,
    CompressionInterceptor,
    ETagInterceptor,
    APMInterceptor,
  ],
  controllers: [HealthController],
  exports: [
    MultiLayerCacheService,
    DataLoaderService,
    QueueService,
    MetricsService,
    CompressionInterceptor,
    ETagInterceptor,
    APMInterceptor,
  ],
})
export class PerformanceModule {}
