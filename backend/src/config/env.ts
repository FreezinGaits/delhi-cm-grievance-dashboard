import dotenv from 'dotenv';
import path from 'path';

// Load .env — try backend root first, then monorepo root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  CORS_ORIGIN: string;

  MONGODB_URI: string;
  MONGODB_DB_NAME: string;

  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string;

  MINIO_ENDPOINT: string;
  MINIO_PORT: number;
  MINIO_ACCESS_KEY: string;
  MINIO_SECRET_KEY: string;
  MINIO_BUCKET: string;
  MINIO_USE_SSL: boolean;

  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRY: string;
  JWT_REFRESH_EXPIRY: string;

  OTP_EXPIRY_MINUTES: number;
  OTP_MAX_ATTEMPTS: number;
  OTP_COOLDOWN_MINUTES: number;

  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;

  LOG_LEVEL: string;
  LOG_FORMAT: string;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue?: number): number {
  const raw = process.env[key];
  if (raw !== undefined) return parseInt(raw, 10);
  if (defaultValue !== undefined) return defaultValue;
  throw new Error(`Missing required environment variable: ${key}`);
}

function getEnvBool(key: string, defaultValue?: boolean): boolean {
  const raw = process.env[key];
  if (raw !== undefined) return raw === 'true';
  if (defaultValue !== undefined) return defaultValue;
  throw new Error(`Missing required environment variable: ${key}`);
}

export const env: EnvConfig = {
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  PORT: getEnvNumber('BACKEND_PORT', 5000),
  CORS_ORIGIN: getEnvVar('CORS_ORIGIN', 'http://localhost:3000'),

  MONGODB_URI: getEnvVar('MONGODB_URI', 'mongodb://admin:password123@localhost:27017/grievance_db?authSource=admin'),
  MONGODB_DB_NAME: getEnvVar('MONGODB_DB_NAME', 'grievance_db'),

  REDIS_HOST: getEnvVar('REDIS_HOST', 'localhost'),
  REDIS_PORT: getEnvNumber('REDIS_PORT', 6379),
  REDIS_PASSWORD: getEnvVar('REDIS_PASSWORD', 'redis_secret_123'),

  MINIO_ENDPOINT: getEnvVar('MINIO_ENDPOINT', 'localhost'),
  MINIO_PORT: getEnvNumber('MINIO_PORT', 9000),
  MINIO_ACCESS_KEY: getEnvVar('MINIO_ACCESS_KEY', 'minioadmin'),
  MINIO_SECRET_KEY: getEnvVar('MINIO_SECRET_KEY', 'miniosecret123'),
  MINIO_BUCKET: getEnvVar('MINIO_BUCKET', 'grievance-uploads'),
  MINIO_USE_SSL: getEnvBool('MINIO_USE_SSL', false),

  JWT_ACCESS_SECRET: getEnvVar('JWT_ACCESS_SECRET', 'dev-access-secret-change-in-production'),
  JWT_REFRESH_SECRET: getEnvVar('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-in-production'),
  JWT_ACCESS_EXPIRY: getEnvVar('JWT_ACCESS_EXPIRY', '15m'),
  JWT_REFRESH_EXPIRY: getEnvVar('JWT_REFRESH_EXPIRY', '7d'),

  OTP_EXPIRY_MINUTES: getEnvNumber('OTP_EXPIRY_MINUTES', 5),
  OTP_MAX_ATTEMPTS: getEnvNumber('OTP_MAX_ATTEMPTS', 3),
  OTP_COOLDOWN_MINUTES: getEnvNumber('OTP_COOLDOWN_MINUTES', 15),

  RATE_LIMIT_WINDOW_MS: getEnvNumber('RATE_LIMIT_WINDOW_MS', 60000),
  RATE_LIMIT_MAX_REQUESTS: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),

  LOG_LEVEL: getEnvVar('LOG_LEVEL', 'debug'),
  LOG_FORMAT: getEnvVar('LOG_FORMAT', 'dev'),
};
