import winston from 'winston';
import { env, isProd } from '../../config/env';

/**
 * Structured logger using Winston.
 *
 * Development: colourised, human-readable console output.
 * Production:  JSON format for ingestion by log aggregators (Datadog, CloudWatch, etc.)
 */

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Human-readable format for local development
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) => {
    return stack
      ? `[${ts}] ${level}: ${message}\n${stack}`
      : `[${ts}] ${level}: ${message}`;
  })
);

// Structured JSON format for production log aggregation
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: isProd ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
  ],
  // Prevent unhandled promise rejections from crashing the logger itself
  exitOnError: false,
});

/**
 * Morgan-compatible stream — pipes HTTP access logs into Winston.
 * Used in the Morgan middleware setup inside app.ts.
 */
export const morganStream = {
  write: (message: string): void => {
    // Morgan appends a newline; trim it before logging
    logger.http(message.trim());
  },
};