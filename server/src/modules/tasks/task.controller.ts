import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/types/api.types';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess } from '../../shared/utils/apiResponse';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  addComment,
} from './task.service';
import {
  CreateTaskInput,
  UpdateTaskInput,
  AddCommentInput,
  TaskQueryInput,
} from './task.routes';

// ── Create Task ───────────────────────────────────────────────────────────────

export const createTaskHandler = asyncHandler<AuthenticatedRequest>(
  async (req: AuthenticatedRequest, res: Response) => {
    const input = req.body as CreateTaskInput;

    const task = await createTask(
      input,
      req.user._id,
      req.user.name
    );

    sendSuccess(res, { task }, {
      message:    'Task created successfully.',
      statusCode: 201,
    });
  }
);

// ── Get Tasks (filtered) ──────────────────────────────────────────────────────

export const getTasksHandler = asyncHandler<AuthenticatedRequest>(
  async (req: AuthenticatedRequest, res: Response) => {
    const query = req.query as unknown as TaskQueryInput;

    const tasks = await getTasks(query, req.user._id);

    sendSuccess(res, { tasks, count: tasks.length });
  }
);

// ── Get Single Task ───────────────────────────────────────────────────────────

export const getTaskByIdHandler = asyncHandler<AuthenticatedRequest>(
  async (req: AuthenticatedRequest, res: Response) => {
    const task = await getTaskById(
      req.params['id'] as string,
      req.user._id
    );

    sendSuccess(res, { task });
  }
);

// ── Update Task ───────────────────────────────────────────────────────────────

export const updateTaskHandler = asyncHandler<AuthenticatedRequest>(
  async (req: AuthenticatedRequest, res: Response) => {
    const input = req.body as UpdateTaskInput;

    const task = await updateTask(
      req.params['id'] as string,
      input,
      req.user._id,
      req.user.name
    );

    sendSuccess(res, { task }, { message: 'Task updated successfully.' });
  }
);

// ── Delete Task ───────────────────────────────────────────────────────────────

export const deleteTaskHandler = asyncHandler<AuthenticatedRequest>(
  async (req: AuthenticatedRequest, res: Response) => {
    await deleteTask(req.params['id'] as string, req.user._id);

    sendSuccess(res, null, { message: 'Task deleted successfully.' });
  }
);

// ── Add Comment ───────────────────────────────────────────────────────────────

export const addCommentHandler = asyncHandler<AuthenticatedRequest>(
  async (req: AuthenticatedRequest, res: Response) => {
    const input = req.body as AddCommentInput;

    const task = await addComment(
      req.params['id'] as string,
      input,
      req.user._id,
      req.user.name
    );

    sendSuccess(res, { task }, {
      message:    'Comment added successfully.',
      statusCode: 201,
    });
  }
);