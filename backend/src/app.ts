import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { initializeMinIO } from './config/minio';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/notFound.middleware';

// Import routes
import authRoutes from './routes/auth.routes';
import complaintRoutes from './routes/complaint.routes';
import departmentRoutes from './routes/department.routes';
import officerRoutes from './routes/officer.routes';
import cmRoutes from './routes/cm.routes';
import analyticsRoutes from './routes/analytics.routes';
import adminRoutes from './routes/admin.routes';
import notificationRoutes from './routes/notification.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import directiveRoutes from './routes/directive.routes';
import governanceRoutes from './routes/governance.routes';

// Import workers
import { startWorkers, scheduleRecurringJobs } from './workers/queue';

const app = express();

// ── Security Middleware ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body Parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(compression());

// ── Logging ──────────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.LOG_FORMAT, {
    stream: { write: (message: string) => logger.info(message.trim()) },
  }));
}

// ── Health Check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'delhi-governance-platform',
      version: env.NODE_ENV === 'development' ? '2.0.0-dev' : '2.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

// ── API Routes ───────────────────────────────────────────────
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/complaints`, complaintRoutes);
app.use(`${API_PREFIX}/departments`, departmentRoutes);
app.use(`${API_PREFIX}/officers`, officerRoutes);
app.use(`${API_PREFIX}/cm`, cmRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/directives`, directiveRoutes);
app.use(`${API_PREFIX}/governance`, governanceRoutes);

// ── WhatsApp Webhook (outside API prefix — Meta requires root path) ──
app.use('/webhooks/whatsapp', whatsappRoutes);

// ── Error Handling ───────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Server Startup ───────────────────────────────────────────
async function startServer(): Promise<void> {
  try {
    // Connect to databases
    await connectDatabase();
    await connectRedis();
    await initializeMinIO();

    // Start BullMQ workers
    startWorkers();
    await scheduleRecurringJobs();

    // Start HTTP server
    const server = app.listen(env.PORT, () => {
      logger.info(`
╔══════════════════════════════════════════════════════════════╗
║    Delhi Governance Intelligence Platform — Backend API      ║
║    Environment: ${env.NODE_ENV.padEnd(45)}║
║    Port: ${String(env.PORT).padEnd(52)}║
║    API: http://localhost:${env.PORT}/api/v1${' '.repeat(29)}║
║    Health: http://localhost:${env.PORT}/api/health${' '.repeat(23)}║
║    WhatsApp Webhook: /webhooks/whatsapp${' '.repeat(22)}║
╚══════════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);
      server.close(async () => {
        await disconnectDatabase();
        await disconnectRedis();
        logger.info('Server shut down gracefully');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
