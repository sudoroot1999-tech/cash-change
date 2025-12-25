import { Module, Global, DynamicModule } from '@nestjs/common';
import { StorageService } from './storage.service';
import * as Minio from 'minio';

@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {
  static register(options: Minio.ClientOptions): DynamicModule {
    return {
      module: StorageModule,
      providers: [
        {
          provide: 'MINIO_CLIENT',
          useFactory: () => {
            return new Minio.Client(options);
          },
        },
        StorageService,
      ],
      exports: [StorageService],
    };
  }

  static registerAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => Promise<Minio.ClientOptions> | Minio.ClientOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: StorageModule,
      imports: options.imports || [],
      providers: [
        {
          provide: 'MINIO_CLIENT',
          useFactory: async (...args: any[]) => {
            const config = await options.useFactory(...args);
            return new Minio.Client(config);
          },
          inject: options.inject || [],
        },
        StorageService,
      ],
      exports: [StorageService],
    };
  }
}
