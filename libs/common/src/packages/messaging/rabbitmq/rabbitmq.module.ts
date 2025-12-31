import { DynamicModule, Module, Global } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { RabbitMQConfig } from './interfaces/rabbitmq-config.interface';

/**
 * RabbitMQ Module for microservices communication
 * Provides message queue functionality with automatic reconnection
 */
@Global()
@Module({})
export class RabbitMQModule {
  /**
   * Register RabbitMQ module with configuration
   * @param config RabbitMQ configuration
   * @returns Dynamic module
   */
  static forRoot(config: RabbitMQConfig): DynamicModule {
    return {
      module: RabbitMQModule,
      providers: [
        {
          provide: 'RABBITMQ_CONFIG',
          useValue: config,
        },
        RabbitMQService,
      ],
      exports: [RabbitMQService],
      global: true,
    };
  }

  /**
   * Register RabbitMQ module asynchronously
   * @param options Async configuration options
   * @returns Dynamic module
   */
  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<RabbitMQConfig> | RabbitMQConfig;
    inject?: any[];
  }): DynamicModule {
    return {
      module: RabbitMQModule,
      providers: [
        {
          provide: 'RABBITMQ_CONFIG',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        RabbitMQService,
      ],
      exports: [RabbitMQService],
      global: true,
    };
  }
}
