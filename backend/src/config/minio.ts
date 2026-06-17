import { Client } from 'minio';
import { env } from './env';
import { logger } from '../utils/logger';

let minioClient: Client | null = null;

/**
 * Get or create MinIO client singleton
 */
export function getMinioClient(): Client {
  if (!minioClient) {
    minioClient = new Client({
      endPoint: env.MINIO_ENDPOINT,
      port: env.MINIO_PORT,
      useSSL: env.MINIO_USE_SSL,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
    });
  }
  return minioClient;
}

/**
 * Initialize MinIO — ensure bucket exists
 */
export async function initializeMinIO(): Promise<void> {
  try {
    const client = getMinioClient();
    const bucketName = env.MINIO_BUCKET;

    const exists = await client.bucketExists(bucketName);
    if (!exists) {
      await client.makeBucket(bucketName, 'us-east-1');
      logger.info(`✅ MinIO bucket "${bucketName}" created`);

      // Set public read policy for uploaded files
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      };
      await client.setBucketPolicy(bucketName, JSON.stringify(policy));
    } else {
      logger.info(`✅ MinIO bucket "${bucketName}" already exists`);
    }
  } catch (error) {
    logger.error('Failed to initialize MinIO:', error);
    logger.warn('Application will continue without MinIO file storage');
  }
}
