import { DynamicModule, Module, Global } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { KafkaConfig } from './interfaces/kafka-config.interface';

/**
 * Kafka Module for event streaming and analytics
 * Provides high-throughput event processing capabilities
 */
@Global()
@Module({})
export class KafkaModule {
  /**
   * Register Kafka module with configuration
   * @param config Kafka configuration
   * @returns Dynamic module
   */
  static forRoot(config: KafkaConfig): DynamicModule {
    return {
      module: KafkaModule,
      providers: [
        {
          provide: 'KAFKA_CONFIG',
          useValue: config,
        },
        KafkaService,
      ],
      exports: [KafkaService],
      global: true,
    };
  }

  /**
   * Register Kafka module asynchronously
   * @param options Async configuration options
   * @returns Dynamic module
   */
  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<KafkaConfig> | KafkaConfig;
    inject?: any[];
  }): DynamicModule {
    return {
      module: KafkaModule,
      providers: [
        {
          provide: 'KAFKA_CONFIG',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        KafkaService,
      ],
      exports: [KafkaService],
      global: true,
    };
  }
}
