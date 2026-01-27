import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import routes from './api/routes';
import { logger } from './utils/logger';
import { setupTimescaleExtension, closeConnections } from './config/database';
import { setupElasticsearchIndices, closeElasticsearch } from './config/elasticsearch';
import { ensureBucketExists } from './config/s3';
import { closeRedis } from './config/redis';
import { ETLRunner } from './etl/runner';

dotenv.config();

const app: Application = express();
const PORT = parseInt(process.env.PORT || '3007');
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);

// Routes
app.use('/api', routes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Initialize services
async function initializeServices() {
  try {
    logger.info('Initializing analytics service...');

    // Setup TimescaleDB
    await setupTimescaleExtension();
    logger.info('TimescaleDB initialized');

    // Setup Elasticsearch
    await setupElasticsearchIndices();
    logger.info('Elasticsearch initialized');

    // Setup S3/MinIO
    await ensureBucketExists();
    logger.info('Data lake initialized');

    // Start ETL scheduler if enabled
    if (process.env.ENABLE_REAL_TIME_ANALYTICS === 'true') {
      const etlRunner = new ETLRunner();
      etlRunner.startScheduledETL();
      logger.info('ETL scheduler started');
    }

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services', error);
    throw error;
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully...`);

  try {
    await closeConnections();
    await closeElasticsearch();
    await closeRedis();
    logger.info('All connections closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
async function startServer() {
  try {
    await initializeServices();

    app.listen(PORT, HOST, () => {
      logger.info(`Analytics service running on ${HOST}:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

startServer();

export default app;
