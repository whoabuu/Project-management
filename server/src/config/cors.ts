import { CorsOptions } from 'cors';
import { env, isProd } from './env';
import { logger } from '../shared/utils/logger';


/**
 * CORS policy configuration.
 *
 * In development: allows the Vite dev server origin (typically :5173).
 * In production:  restricts to CLIENT_ORIGIN only and enforces credentials.
 *
 * The allowedOrigins list can be extended for multi-tenant deployments
 * by moving it to an environment variable that accepts a comma-separated list.
 */
const allowedOrigins = env.CORS_ORIGIN;

export const corsOptions: CorsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    // Allow server-to-server requests (no Origin header) only in non-prod
    if (!origin && !isProd) {
      return callback(null, true);
    }

    if (origin && allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn(`CORS blocked request from origin: ${origin ?? 'unknown'}`);
    callback(new Error(`Origin ${origin} is not allowed by CORS policy`));
  },

  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID', // For distributed tracing
  ],

  exposedHeaders: [
    'X-Total-Count', // Pagination metadata
    'X-Request-ID',
  ],

  credentials: true,        // Required for cookies / Authorization headers
  maxAge: 86400,            // Cache preflight for 24 hours
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
};