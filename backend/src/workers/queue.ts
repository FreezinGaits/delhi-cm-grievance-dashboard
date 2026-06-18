import { Queue, Worker } from 'bullmq';
import { env } from '../config/env';
import { WhatsAppService } from '../services/whatsapp.service';
import { WhatsAppProvider } from '../services/whatsapp.provider';
import { ClusteringService } from '../services/clustering.service';
import { AccountabilityService } from '../services/accountability.service';
import { DirectiveService } from '../services/directive.service';
import { logger } from '../utils/logger';

/**
 * BullMQ Queue Definitions and Workers.
 *
 * Uses raw Redis connection options (not an IORedis instance) to avoid
 * version conflicts between the app-level ioredis and BullMQ's bundled copy.
 *
 * Queues:
 *   1. whatsapp-incoming   — Process incoming WhatsApp messages
 *   2. whatsapp-media      — Download WhatsApp media attachments
 *   3. whatsapp-notify     — Send outbound WhatsApp status notifications
 *   4. clustering          — Periodic DBSCAN spatial clustering
 *   5. accountability      — Periodic officer score computation
 *   6. directive-check     — Check for overdue directives
 */

const redisConnection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null as null, // Required by BullMQ
};

// ── Queue Instances ─────────────────────────────────────────

export function createQueues() {
  try {
    return {
      whatsappIncoming: new Queue('whatsapp-incoming', { connection: redisConnection }),
      whatsappMedia: new Queue('whatsapp-media', { connection: redisConnection }),
      whatsappNotify: new Queue('whatsapp-notify', { connection: redisConnection }),
      clustering: new Queue('clustering', { connection: redisConnection }),
      accountability: new Queue('accountability', { connection: redisConnection }),
      directiveCheck: new Queue('directive-check', { connection: redisConnection }),
    };
  } catch (err) {
    logger.warn('[BullMQ] Failed to create queues:', err);
    return null;
  }
}

// ── Worker Definitions ──────────────────────────────────────

export function startWorkers() {
  try {
    // 1. WhatsApp Incoming Message Processor
    new Worker(
      'whatsapp-incoming',
      async (job) => {
        const { from, message } = job.data;
        logger.info(`[Worker:whatsapp-incoming] Processing message from ${from}`);
        await WhatsAppService.processIncomingMessage(from, message);
      },
      { connection: redisConnection, concurrency: 5 },
    );

    // 2. WhatsApp Media Downloader
    new Worker(
      'whatsapp-media',
      async (job) => {
        const { mediaId } = job.data;
        logger.info(`[Worker:whatsapp-media] Downloading media ${mediaId}`);
        const result = await WhatsAppProvider.downloadMedia(mediaId);
        if (result.success) {
          logger.info(`[Worker:whatsapp-media] Downloaded ${mediaId} (${result.mimeType})`);
        }
      },
      { connection: redisConnection },
    );

    // 3. WhatsApp Outbound Notifications
    new Worker(
      'whatsapp-notify',
      async (job) => {
        const { to, body, type } = job.data;
        logger.info(`[Worker:whatsapp-notify] Sending ${type} notification to ${to}`);
        await WhatsAppProvider.sendTextMessage(to, body);
      },
      { connection: redisConnection, concurrency: 10 },
    );

    // 4. Clustering Worker (scheduled via cron)
    new Worker(
      'clustering',
      async () => {
        logger.info('[Worker:clustering] Running spatial clustering...');
        const result = await ClusteringService.runClustering();
        logger.info(`[Worker:clustering] Complete: ${JSON.stringify(result)}`);
      },
      { connection: redisConnection },
    );

    // 5. Accountability Score Computation (scheduled via cron)
    new Worker(
      'accountability',
      async (job) => {
        const period = job.data?.period || 'weekly';
        logger.info(`[Worker:accountability] Computing ${period} scores...`);
        const result = await AccountabilityService.computeAllScores(period);
        logger.info(`[Worker:accountability] Complete: ${JSON.stringify(result)}`);
      },
      { connection: redisConnection },
    );

    // 6. Directive Overdue Checker (scheduled via cron)
    new Worker(
      'directive-check',
      async () => {
        logger.info('[Worker:directive-check] Checking overdue directives...');
        const count = await DirectiveService.checkOverdueDirectives();
        logger.info(`[Worker:directive-check] ${count} directives marked overdue`);
      },
      { connection: redisConnection },
    );

    logger.info('[BullMQ] All workers started successfully');
  } catch (err) {
    logger.warn('[BullMQ] Failed to start workers:', err);
  }
}

/**
 * Schedule recurring jobs (cron-style).
 * Call this after server startup.
 */
export async function scheduleRecurringJobs() {
  const queues = createQueues();
  if (!queues) {
    logger.warn('[BullMQ] Cannot schedule recurring jobs — Redis unavailable');
    return;
  }

  try {
    // Run clustering every 15 minutes
    await queues.clustering.add(
      'spatial-clustering',
      {},
      {
        repeat: { pattern: '*/15 * * * *' },
        removeOnComplete: { count: 10 },
        removeOnFail: { count: 5 },
      },
    );

    // Compute accountability scores daily at midnight
    await queues.accountability.add(
      'daily-scores',
      { period: 'weekly' },
      {
        repeat: { pattern: '0 0 * * *' },
        removeOnComplete: { count: 7 },
      },
    );

    // Check overdue directives every hour
    await queues.directiveCheck.add(
      'overdue-check',
      {},
      {
        repeat: { pattern: '0 * * * *' },
        removeOnComplete: { count: 24 },
      },
    );

    logger.info('[BullMQ] Recurring jobs scheduled');
  } catch (err) {
    logger.warn('[BullMQ] Failed to schedule recurring jobs:', err);
  }
}
