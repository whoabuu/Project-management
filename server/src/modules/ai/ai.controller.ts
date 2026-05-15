import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../shared/types/api.types';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { AppError } from '../../middleware/error.middleware';
import { decomposeEpic } from './agents/scrumMaster.agent';
import { generateStandup } from './agents/standup.agent';

// ── Zod Schemas ───────────────────────────────────────────────────────────────

export const DecomposeEpicSchema = z.object({
  epicId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid epicId — must be a valid MongoDB ObjectId'),
});

export const StandupParamSchema = z.object({
  projectId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid projectId — must be a valid MongoDB ObjectId'),
});

export const ConfirmTasksSchema = z.object({
  epicId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid epicId'),

  tasks: z
    .array(
      z.object({
        title:           z.string().min(2).max(250).trim(),
        description:     z.string().max(20000).optional(),
        type:            z.enum(['story', 'task', 'subtask']),
        priority:        z.enum(['critical', 'high', 'medium', 'low']),
        storyPoints:     z.number().optional(),
        estimatedHours:  z.number().min(0).max(999),
        tags:            z.array(z.string()).default([]),
        assigneeId:      z.string().regex(/^[a-f\d]{24}$/i).optional(),
        confidenceScore: z.number().min(0).max(1),
      })
    )
    .min(1, 'Must confirm at least one task'),
});

export type DecomposeEpicInput  = z.infer<typeof DecomposeEpicSchema>;
export type ConfirmTasksInput   = z.infer<typeof ConfirmTasksSchema>;

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/ai/scrum-master/decompose
 *
 * Accepts an epicId, runs the scrumMaster.agent, and returns draft tasks.
 * Nothing is persisted at this stage — the user reviews and confirms.
 */
export const decomposeEpicHandler = asyncHandler<AuthenticatedRequest>(
  async (req: AuthenticatedRequest, res: Response) => {
    const { epicId } = req.body as DecomposeEpicInput;

    const result = await decomposeEpic(epicId, req.user._id);

    sendSuccess(res, result, {
      message: `Generated ${result.tasks.length} task drafts. Review and confirm to save.`,
      statusCode: 200,
    });
  }
);

/**
 * POST /api/v1/ai/scrum-master/confirm
 *
 * Persists the user-reviewed AI-generated tasks to the database.
 * Each saved task is flagged with aiMeta.aiGenerated = true.
 */
export const confirmTasksHandler = asyncHandler<AuthenticatedRequest>(
  async (req: AuthenticatedRequest, res: Response) => {
    const { epicId, tasks } = req.body as ConfirmTasksInput;

    const { TaskModel }   = await import('../../models/Task.model');
    const { Types }       = await import('mongoose');

    // Fetch the epic to get projectId
    const epic = await TaskModel.findById(new Types.ObjectId(epicId));
    if (!epic) throw new AppError('Epic not found.', 404);

    const savedTasks = await Promise.all(
      tasks.map((draft, index) =>
        TaskModel.create({
          projectId:   epic.projectId,
          parentId:    epic._id,
          reporterId:  req.user._id,
          assigneeId:  draft.assigneeId
            ? new Types.ObjectId(draft.assigneeId)
            : undefined,
          title:          draft.title,
          description:    draft.description,
          type:           draft.type,
          status:         'backlog',
          columnId:       'backlog',
          priority:       draft.priority,
          storyPoints:    draft.storyPoints,
          estimatedHours: draft.estimatedHours,
          tags:           draft.tags,
          order:          index,
          aiMeta: {
            aiGenerated:          true,
            generatedFromEpicId:  epic._id,
            confidenceScore:      draft.confidenceScore,
          },
          activityLog: [
            {
              actorId:       req.user._id,
              actorName:     req.user.name,
              action:        'confirmed AI-generated task from Epic decomposition',
              isAIGenerated: true,
              timestamp:     new Date(),
            },
          ],
        })
      )
    );

    // Link all saved tasks as children of the Epic
    await TaskModel.findByIdAndUpdate(
      epic._id,
      { $addToSet: { childIds: { $each: savedTasks.map((t) => t._id) } } } as Record<string, unknown>
    );

    sendSuccess(res, { tasks: savedTasks, count: savedTasks.length }, {
      message: `${savedTasks.length} tasks saved to the backlog successfully.`,
      statusCode: 201,
    });
  }
);

/**
 * GET /api/v1/ai/standup/:projectId
 *
 * Triggers the standup agent and returns the Markdown summary.
 */
export const generateStandupHandler = asyncHandler<AuthenticatedRequest>(
  async (req: AuthenticatedRequest, res: Response) => {
    const { projectId } = req.params as { projectId: string };

    const result = await generateStandup(projectId, req.user._id);

    sendSuccess(res, result, {
      message: 'Daily standup generated successfully.',
    });
  }
);