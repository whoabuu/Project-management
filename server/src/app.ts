import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { corsOptions } from './config/cors';
import { morganStream } from './shared/utils/logger';
import { globalErrorHandler } from './middleware/error.middleware';
import { sendSuccess } from './shared/utils/apiResponse';
import { env } from './config/env';

// ── Route Imports (modules registered as they are built) ─────────────────────
// import { authRouter }    from './modules/auth/auth.routes';
// import { userRouter }    from './modules/users/user.routes';
// import { projectRouter } from './modules/projects/project.routes';
// import { taskRouter }    from './modules/tasks/task.routes';
// import { aiRouter }      from './modules/ai/ai.routes';

/**
 * Express application factory.
 *
 * Separating the app from server.ts allows the application to be imported
 * cleanly in integration tests without binding to a port.
 */
export const createApp = (): Application => {
  const app = express();

  // ── Security Headers ───────────────────────────────────────────────────────
  // Helmet sets sensible defaults: X-Frame-Options, X-XSS-Protection, etc.
  app.use(helmet());

  // ── CORS ───────────────────────────────────────────────────────────────────
  app.use(cors(corsOptions));
  app.options(/(.*)/, cors(corsOptions)); // Pre-flight for all routes

  // ── Body Parsing ───────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));          // Reject oversized payloads
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ── HTTP Request Logging ───────────────────────────────────────────────────
  // 'combined' in prod for full log lines; 'dev' for colorised local output
  const morganFormat = env.NODE_ENV === 'production' ? 'combined' : 'dev';
  app.use(morgan(morganFormat, { stream: morganStream }));

  // ── Health Check ───────────────────────────────────────────────────────────
  // Deliberately placed BEFORE auth middleware so load balancers can reach it
  app.get('/health', (_req: Request, res: Response) => {
    sendSuccess(res, {
      status: 'healthy',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  // ── API Routes ─────────────────────────────────────────────────────────────
  //const API_PREFIX = '/api/v1';

  // Uncomment each line as the module is built in subsequent phases:
  // app.use(`${API_PREFIX}/auth`,     authRouter);
  // app.use(`${API_PREFIX}/users`,    userRouter);
  // app.use(`${API_PREFIX}/projects`, projectRouter);
  // app.use(`${API_PREFIX}/tasks`,    taskRouter);
  // app.use(`${API_PREFIX}/ai`,       aiRouter);

  // ── 404 Handler ────────────────────────────────────────────────────────────
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: `Route ${req.method} ${req.originalUrl} not found.`,
    });
  });

  // ── Global Error Handler ───────────────────────────────────────────────────
  // MUST be registered last — Express identifies error handlers by arity (4 params)
  app.use(globalErrorHandler);

  return app;
};