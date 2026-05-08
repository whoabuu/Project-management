import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import {
  createTaskHandler,
  getTasksHandler,
  getTaskByIdHandler,
  updateTaskHandler,
  deleteTaskHandler,
  addCommentHandler,
} from './task.controller';

// ── Zod Schemas ───────────────────────────────────────────────────────────────

export const CreateTaskSchema = z.object({
  // Required
  projectId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid projectId format'),

  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(250, 'Title cannot exceed 250 characters')
    .trim(),

  // Optional core fields
  description: z
    .string()
    .max(20000, 'Description cannot exceed 20000 characters')
    .trim()
    .optional(),

  type: z
    .enum(['epic', 'story', 'task', 'bug', 'subtask'])
    .default('task'),

  status: z
    .enum(['backlog', 'todo', 'in_progress', 'review', 'done'])
    .default('backlog'),

  priority: z
    .enum(['critical', 'high', 'medium', 'low'])
    .default('medium'),

  storyPoints: z
    .number()
    .refine((v) => [0, 1, 2, 3, 5, 8, 13, 21].includes(v), {
      message: 'Story points must be a Fibonacci number: 0,1,2,3,5,8,13,21',
    })
    .optional(),

  estimatedHours: z
    .number()
    .min(0)
    .max(999)
    .optional(),

  // People
  assigneeId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid assigneeId format')
    .optional(),

  watcherIds: z
    .array(z.string().regex(/^[a-f\d]{24}$/i, 'Invalid watcherId format'))
    .default([]),

  // Hierarchy
  parentId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid parentId format')
    .optional(),

  sprintId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid sprintId format')
    .optional(),

  // Metadata
  tags: z
    .array(z.string().trim().min(1).max(30))
    .max(10, 'Cannot add more than 10 tags')
    .default([]),

  dueDate: z
    .string()
    .datetime({ message: 'dueDate must be a valid ISO 8601 datetime' })
    .optional(),

  order: z.number().default(0),
});

export const UpdateTaskSchema = z
  .object({
    title: z
      .string()
      .min(2)
      .max(250)
      .trim()
      .optional(),

    description: z
      .string()
      .max(20000)
      .trim()
      .optional(),

    status: z
      .enum(['backlog', 'todo', 'in_progress', 'review', 'done'])
      .optional(),

    priority: z
      .enum(['critical', 'high', 'medium', 'low'])
      .optional(),

    storyPoints: z
      .number()
      .refine((v) => [0, 1, 2, 3, 5, 8, 13, 21].includes(v), {
        message: 'Story points must be a Fibonacci number',
      })
      .optional(),

    estimatedHours: z.number().min(0).max(999).optional(),
    actualHours:    z.number().min(0).max(999).optional(),

    assigneeId: z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .nullable()
      .optional(),

    sprintId: z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .nullable()
      .optional(),

    tags:     z.array(z.string().trim().min(1).max(30)).max(10).optional(),
    dueDate:  z.string().datetime().nullable().optional(),
    order:    z.number().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update.',
  });

export const AddCommentSchema = z.object({
  body: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(5000, 'Comment cannot exceed 5000 characters')
    .trim(),
});

export const TaskIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid task ID format'),
});

export const TaskQuerySchema = z.object({
  projectId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid projectId format'),

  status: z
    .enum(['backlog', 'todo', 'in_progress', 'review', 'done'])
    .optional(),

  assigneeId: z
    .string()
    .regex(/^[a-f\d]{24}$/i)
    .optional(),

  type: z
    .enum(['epic', 'story', 'task', 'bug', 'subtask'])
    .optional(),

  sprintId: z
    .string()
    .regex(/^[a-f\d]{24}$/i)
    .optional(),

  priority: z
    .enum(['critical', 'high', 'medium', 'low'])
    .optional(),
});

// ── Inferred Types ────────────────────────────────────────────────────────────

export type CreateTaskInput  = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput  = z.infer<typeof UpdateTaskSchema>;
export type AddCommentInput  = z.infer<typeof AddCommentSchema>;
export type TaskQueryInput   = z.infer<typeof TaskQuerySchema>;

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

router.use(requireAuth);

/**
 * POST  /api/v1/tasks        — Create a task
 * GET   /api/v1/tasks        — Get tasks (filtered by projectId query param)
 */
router
  .route('/')
  .post(validate('body', CreateTaskSchema), createTaskHandler)
  .get(validate('query', TaskQuerySchema), getTasksHandler);

/**
 * GET    /api/v1/tasks/:id   — Get single task
 * PATCH  /api/v1/tasks/:id   — Update task
 * DELETE /api/v1/tasks/:id   — Delete task
 */
router
  .route('/:id')
  .get(validate('params', TaskIdParamSchema), getTaskByIdHandler)
  .patch(
    validate('params', TaskIdParamSchema),
    validate('body', UpdateTaskSchema),
    updateTaskHandler
  )
  .delete(validate('params', TaskIdParamSchema), deleteTaskHandler);

/**
 * POST /api/v1/tasks/:id/comments — Add a comment to a task
 */
router.post(
  '/:id/comments',
  validate('params', TaskIdParamSchema),
  validate('body', AddCommentSchema),
  addCommentHandler
);

export { router as taskRouter };