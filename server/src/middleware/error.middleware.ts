import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { sendError } from '../shared/utils/apiResponse';
import { logger } from '../shared/utils/logger';
import { isDev, isProd } from '../config/env';

/**
 * Custom application error class.
 * Throw this anywhere in the app to produce a controlled HTTP error response.
 *
 * Usage:
 *   throw new AppError('Project not found', 404);
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true; // Distinguishes from unexpected programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global Express error-handling middleware.
 * Must be registered LAST in app.ts (after all routes).
 *
 * Handles four error categories:
 *   1. AppError        — our own controlled errors
 *   2. ZodError        — validation failures from request schemas
 *   3. MongooseError   — DB-level errors (CastError, duplicate key, etc.)
 *   4. Unknown         — unexpected programming errors
 */
export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction // Must be declared even if unused — Express requires 4 params
): void => {
  logger.error(`[${req.method}] ${req.path} — ${err.message}`, {
    stack: isDev ? err.stack : undefined,
  });

  // 1. Our own operational errors
  if (err instanceof AppError) {
    sendError(res, err.message, { statusCode: err.statusCode });
    return;
  }

  // 2. Zod validation errors — always a 400
  if (err instanceof ZodError) {
    sendError(res, 'Validation failed', {
      statusCode: 400,
      details: err.flatten().fieldErrors,
    });
    return;
  }

  // 3a. Mongoose CastError — invalid ObjectId in URL params
  if (err instanceof mongoose.Error.CastError) {
    sendError(res, `Invalid value for field: ${err.path}`, { statusCode: 400 });
    return;
  }

  // 3b. Mongoose ValidationError — schema-level constraint violations
  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    sendError(res, 'Database validation failed', {
      statusCode: 422,
      details: messages,
    });
    return;
  }

  // 3c. MongoDB duplicate key error (e.g. unique email / slug)
  if ('code' in err && (err as NodeJS.ErrnoException).code === '11000') {
    const field = Object.keys((err as Record<string, unknown>)['keyValue'] as object)[0];
    sendError(res, `A record with this ${field ?? 'value'} already exists.`, {
      statusCode: 409,
    });
    return;
  }

  // 4. Unknown / unexpected error — don't leak internals in production
  sendError(
    res,
    isProd ? 'An unexpected server error occurred.' : err.message,
    {
      statusCode: 500,
      details: isDev ? err.stack : undefined,
    }
  );
};

// Re-export isDev for use inside this file without a config import cycle
// const { isProd } = await import('../config/env').then((m) => ({
//   isProd: m.isProd,
// }));