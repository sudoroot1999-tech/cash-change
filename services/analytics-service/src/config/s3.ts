import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

export const s3Client = new AWS.S3({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  accessKeyId: process.env.S3_ACCESS_KEY || 'minio_access_key',
  secretAccessKey: process.env.S3_SECRET_KEY || 'minio_secret_key',
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
  region: process.env.S3_REGION || 'us-east-1',
});

export const S3_BUCKET = process.env.S3_BUCKET || 'analytics-data-lake';

export async function ensureBucketExists() {
  try {
    await s3Client.headBucket({ Bucket: S3_BUCKET }).promise();
    console.log(`S3 bucket ${S3_BUCKET} exists`);
  } catch (error: any) {
    if (error.statusCode === 404) {
      await s3Client.createBucket({ Bucket: S3_BUCKET }).promise();
      console.log(`Created S3 bucket: ${S3_BUCKET}`);
    } else {
      console.error('Error checking S3 bucket:', error);
    }
  }
}

export function uploadToDataLake(key: string, data: Buffer | string): Promise<AWS.S3.ManagedUpload.SendData> {
  return s3Client
    .upload({
      Bucket: S3_BUCKET,
      Key: key,
      Body: data,
    })
    .promise();
}

export function downloadFromDataLake(key: string): Promise<AWS.S3.GetObjectOutput> {
  return s3Client
    .getObject({
      Bucket: S3_BUCKET,
      Key: key,
    })
    .promise();
}
