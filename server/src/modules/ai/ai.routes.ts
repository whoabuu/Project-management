import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  decomposeEpicHandler,
  confirmTasksHandler,
  generateStandupHandler,
  DecomposeEpicSchema,
  StandupParamSchema,
  ConfirmTasksSchema,
} from './ai.controller';

const router = Router();

// All AI routes require authentication
router.use(requireAuth);

/**
 * POST /api/v1/ai/scrum-master/decompose
 *
 * Step 1: Feed an Epic to the Scrum Master agent.
 * Returns draft tasks for user review — nothing saved yet.
 *
 * Body: { epicId: string }
 */
router.post(
  '/scrum-master/decompose',
  validate('body', DecomposeEpicSchema),
  decomposeEpicHandler
);

/**
 * POST /api/v1/ai/scrum-master/confirm
 *
 * Step 2: User reviews the drafts and confirms.
 * Persists the approved tasks to the database as AI-generated.
 *
 * Body: { epicId: string, tasks: GeneratedTaskDraft[] }
 */
router.post(
  '/scrum-master/confirm',
  validate('body', ConfirmTasksSchema),
  confirmTasksHandler
);

/**
 * GET /api/v1/ai/standup/:projectId
 *
 * Generates and returns the daily standup summary.
 * Also persists the summary to the project's history ring buffer.
 *
 * Params: projectId
 */
router.get(
  '/standup/:projectId',
  validate('params', StandupParamSchema),
  generateStandupHandler
);

export { router as aiRouter };