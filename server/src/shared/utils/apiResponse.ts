import { Response } from 'express';

/**
 * Standardised API response envelope.
 * Every endpoint — success or error — uses this shape.
 * This makes client-side handling deterministic and type-safe.
 *
 * Success:  { success: true,  data: T,      message?: string }
 * Error:    { success: false, error: string, details?: unknown }
 */

export interface ApiSuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
  meta?: Record<string, unknown>; // Pagination, counts, etc.
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown; // Zod validation errors, stack traces in dev, etc.
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ── Helper Methods ────────────────────────────────────────────────────────────

export const sendSuccess = <T>(
  res: Response,
  data: T,
  options: {
    message?: string;
    statusCode?: number;
    meta?: Record<string, unknown>;
  } = {}
): Response<ApiSuccessResponse<T>> => {
  const { message, statusCode = 200, meta } = options;
  return res.status(statusCode).json({
    success: true,
    ...(message && { message }),
    data,
    ...(meta && { meta }),
  });
};

export const sendError = (
  res: Response,
  error: string,
  options: {
    statusCode?: number;
    details?: unknown;
  } = {}
): Response<ApiErrorResponse> => {
  const { statusCode = 500, details } = options;
  return res.status(statusCode).json({
    success: false,
    error,
    ...(details !== undefined && { details }),
  });
};