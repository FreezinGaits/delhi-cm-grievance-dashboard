import { Queue, Worker } from 'bullmq';
import { env } from '../config/env';
import { WhatsAppService } from '../services/whatsapp.service';
import { WhatsAppProvider } from '../services/whatsapp.provider';
import { ClusteringService } from '../services/clustering.service';
import { AccountabilityService } from '../services/accountability.service';
import { DirectiveService } from '../services/directive.service';
import { ComplaintAgentOrchestrator } from '../agents/orchestrator';
import { Complaint } from '../models/Complaint';
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
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null as null, // Required by BullMQ
  tls: (env.REDIS_HOST !== 'localhost' && env.REDIS_HOST !== '127.0.0.1') ? {} : undefined,
};

// ── Queue Instances ─────────────────────────────────────────

export function createQueues() {
  try {
    const queues = {
      whatsappIncoming: new Queue('whatsapp-incoming', { connection: redisConnection }),
      whatsappMedia: new Queue('whatsapp-media', { connection: redisConnection }),
      whatsappNotify: new Queue('whatsapp-notify', { connection: redisConnection }),
      clustering: new Queue('clustering', { connection: redisConnection }),
      accountability: new Queue('accountability', { connection: redisConnection }),
      directiveCheck: new Queue('directive-check', { connection: redisConnection }),
      sessionCleanup: new Queue('session-cleanup', { connection: redisConnection }),
      aiAnalysis: new Queue('ai-analysis', { connection: redisConnection }),
    };

    // Attach error listeners to prevent unhandled promise rejections / crashes
    Object.entries(queues).forEach(([name, queue]) => {
      queue.on('error', (err) => {
        logger.warn(`[BullMQ] Queue "${name}" connection error: ${err.message}`);
      });
    });

    return queues;
  } catch (err) {
    logger.warn('[BullMQ] Failed to create queues:', err);
    return null;
  }
}

// ── Worker Definitions ──────────────────────────────────────

export function startWorkers() {
  try {
    const workers = [];

    // 1. WhatsApp Incoming Message Processor
    const wIncoming = new Worker(
      'whatsapp-incoming',
      async (job) => {
        const { from, message } = job.data;
        logger.info(`[Worker:whatsapp-incoming] Processing message from ${from}`);
        await WhatsAppService.processIncomingMessage(from, message);
      },
      { connection: redisConnection, concurrency: 5 },
    );
    workers.push({ name: 'whatsapp-incoming', worker: wIncoming });

    // 2. WhatsApp Media Downloader
    const wMedia = new Worker(
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
    workers.push({ name: 'whatsapp-media', worker: wMedia });

    // 3. WhatsApp Outbound Notifications
    const wNotify = new Worker(
      'whatsapp-notify',
      async (job) => {
        const { to, body, type } = job.data;
        logger.info(`[Worker:whatsapp-notify] Sending ${type} notification to ${to}`);
        await WhatsAppProvider.sendTextMessage(to, body);
      },
      { connection: redisConnection, concurrency: 10 },
    );
    workers.push({ name: 'whatsapp-notify', worker: wNotify });

    // 4. Clustering Worker (scheduled via cron)
    const wClustering = new Worker(
      'clustering',
      async () => {
        logger.info('[Worker:clustering] Running spatial clustering...');
        const result = await ClusteringService.runClustering();
        logger.info(`[Worker:clustering] Complete: ${JSON.stringify(result)}`);
      },
      { connection: redisConnection },
    );
    workers.push({ name: 'clustering', worker: wClustering });

    // 5. Accountability Score Computation (scheduled via cron)
    const wAccountability = new Worker(
      'accountability',
      async (job) => {
        const period = job.data?.period || 'weekly';
        logger.info(`[Worker:accountability] Computing ${period} scores...`);
        const result = await AccountabilityService.computeAllScores(period);
        logger.info(`[Worker:accountability] Complete: ${JSON.stringify(result)}`);
      },
      { connection: redisConnection },
    );
    workers.push({ name: 'accountability', worker: wAccountability });

    // 6. Directive Overdue Checker (scheduled via cron)
    const wDirectiveCheck = new Worker(
      'directive-check',
      async () => {
        logger.info('[Worker:directive-check] Checking overdue directives...');
        const count = await DirectiveService.checkOverdueDirectives();
        logger.info(`[Worker:directive-check] ${count} directives marked overdue`);
      },
      { connection: redisConnection },
    );
    workers.push({ name: 'directive-check', worker: wDirectiveCheck });

    // 7. Session Cleanup Worker (scheduled via cron)
    const wSessionCleanup = new Worker(
      'session-cleanup',
      async () => {
        logger.info('[Worker:session-cleanup] Cleaning up stagnant WhatsApp sessions...');
        const count = await WhatsAppService.cleanupStagnantSessions();
        logger.info(`[Worker:session-cleanup] ${count} stagnant sessions closed`);
      },
      { connection: redisConnection },
    );
    workers.push({ name: 'session-cleanup', worker: wSessionCleanup });

    // 8. AI Analysis Worker (on-demand via queue)
    const wAIAnalysis = new Worker(
      'ai-analysis',
      async (job) => {
        const { complaintId } = job.data;
        logger.info(`[Worker:ai-analysis] Analyzing complaint ${complaintId}`);

        const complaint = await Complaint.findById(complaintId);
        if (!complaint) {
          logger.warn(`[Worker:ai-analysis] Complaint ${complaintId} not found`);
          return;
        }

        const CRITICAL_KEYWORDS = ['open manhole', 'manhole', 'live wire', 'gas leak', 'collapse', 'fire', 'flood', 'sinkhole'];
        const text = `${complaint.title} ${complaint.description}`.toLowerCase();
        const isCriticalKeyword = CRITICAL_KEYWORDS.some(kw => text.includes(kw));

        const imageUrls = (complaint.media || []).filter(m => m.type === 'image').map(m => m.url);

        const result = await ComplaintAgentOrchestrator.analyzeComplaint({
          complaintId: complaint._id.toString(),
          title: complaint.title,
          description: complaint.description,
          category: complaint.category,
          latitude: complaint.location.coordinates[1],
          longitude: complaint.location.coordinates[0],
          imageUrls,
          ward: complaint.address?.ward,
          district: complaint.address?.district,
          isCriticalKeyword,
        });

        logger.info(`[Worker:ai-analysis] Complete for ${complaintId}: ${result.orchestratorMeta.agentsRun.length} agents ran`);
      },
      { connection: redisConnection },
    );
    workers.push({ name: 'ai-analysis', worker: wAIAnalysis });

    // Attach error handlers to all workers to prevent crashes
    workers.forEach(({ name, worker }) => {
      worker.on('error', (err) => {
        logger.warn(`[BullMQ] Worker "${name}" connection error: ${err.message}`);
      });
    });

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

    // Clean stagnant WhatsApp sessions hourly
    await queues.sessionCleanup.add(
      'cleanup',
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
