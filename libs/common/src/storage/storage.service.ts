import { Injectable, Inject, Logger } from '@nestjs/common';
import * as Minio from 'minio';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(@Inject('MINIO_CLIENT') private readonly minioClient: Minio.Client) {}

  async createBucketIfNotExists(bucketName: string) {
    const exists = await this.minioClient.bucketExists(bucketName);
    if (!exists) {
      this.logger.log(`Bucket ${bucketName} does not exist. Creating...`);
      await this.minioClient.makeBucket(bucketName);
    }
  }

  async uploadFile(bucketName: string, objectName: string, stream: Readable | Buffer, size?: number, metaData?: Minio.ItemBucketMetadata) {
    await this.createBucketIfNotExists(bucketName);
    return this.minioClient.putObject(bucketName, objectName, stream, size, metaData);
  }

  async getFileUrl(bucketName: string, objectName: string, expiry: number = 24 * 60 * 60) {
    return this.minioClient.presignedGetObject(bucketName, objectName, expiry);
  }

  async deleteFile(bucketName: string, objectName: string) {
    return this.minioClient.removeObject(bucketName, objectName);
  }
}
