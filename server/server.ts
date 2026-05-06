import { createApp } from './src/app';
import { connectDB, disconnectDB } from './src/config/db';
import { env } from './src/config/env';
import { logger } from './src/shared/utils/logger';

/**
 * Server entrypoint.
 *
 * Responsibilities:
 *   1. Connect to MongoDB Atlas
 *   2. Create and start the Express application
 *   3. Register graceful shutdown handlers
 *
 * Any startup failure exits the process with code 1 so that
 * Docker / PM2 / Kubernetes can detect and restart the service.
 */

const bootstrap = async (): Promise<void> => {
  // Step 1: Database — fail fast before binding the HTTP port
  await connectDB();

  // Step 2: Application
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(
      `🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`
    );
    logger.info(`   Health check: http://localhost:${env.PORT}/health`);
  });

  // ── Graceful Shutdown ──────────────────────────────────────────────────────
  // Allows in-flight requests to complete before the process exits.
  // Critical for zero-downtime deployments.

  const shutdown = async (signal: string): Promise<void> => {
    logger.warn(`${signal} received — initiating graceful shutdown...`);

    server.close(async () => {
      logger.info('HTTP server closed. Closing DB connection...');
      await disconnectDB();
      logger.info('Shutdown complete. Goodbye. 👋');
      process.exit(0);
    });

    // Force-kill if graceful shutdown takes longer than 10 seconds
    setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM')); // Kubernetes / Docker stop
  process.on('SIGINT',  () => shutdown('SIGINT'));  // Ctrl+C in terminal

  // Handle unhandled promise rejections — log and exit
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled Promise Rejection:', { reason });
    shutdown('unhandledRejection').catch(() => process.exit(1));
  });
};

bootstrap().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Fatal startup error: ${message}`);
  process.exit(1);
});