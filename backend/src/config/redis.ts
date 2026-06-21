import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;

/**
 * Get or create Redis client singleton
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisOptions: any = {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null, // required for BullMQ
      retryStrategy(times: number) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
      lazyConnect: true,
    };

    if (env.REDIS_HOST !== 'localhost' && env.REDIS_HOST !== '127.0.0.1') {
      redisOptions.tls = {};
    }

    redisClient = new Redis(redisOptions);

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error:', err.message);
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis reconnecting...');
    });
  }

  return redisClient;
}

/**
 * Connect to Redis
 */
export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  try {
    await client.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    // Don't exit — Redis is optional for some features
    logger.warn('Application will continue without Redis cache');
  }
}

/**
 * Disconnect from Redis
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis disconnected gracefully');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
    redisClient = null;
  }
}
