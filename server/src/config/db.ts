import mongoose from 'mongoose';
import { env} from './env';
import { logger } from '../shared/utils/logger';

/**
 * Establishes a connection to MongoDB Atlas.
 * Called once at server startup — Mongoose handles connection pooling internally.
 * The function is intentionally separate from app.ts so it can be
 * independently mocked in tests.
 */
export const connectDB = async (): Promise<void> => {
  try {
    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(env.MONGO_URI, {
      // These are the recommended production settings for Atlas
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB connected: ${conn.connection.host}`);

    // ── Connection event listeners ──────────────────────────────────────────
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected.');
    });

    mongoose.connection.on('error', (err: Error) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`MongoDB connection failed: ${message}`);
    // Exit — the server is non-functional without a DB connection
    process.exit(1);
  }
};

/**
 * Gracefully closes the Mongoose connection.
 * Called by the SIGTERM/SIGINT handlers in server.ts.
 */
export const disconnectDB = async (): Promise<void> => {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed.');
};