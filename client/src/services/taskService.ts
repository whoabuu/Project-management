import { apiGet, apiPatch } from '../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ApiTaskType     = 'epic' | 'story' | 'task' | 'bug' | 'subtask';
export type ApiTaskStatus   = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type ApiTaskPriority = 'critical' | 'high' | 'medium' | 'low';

/** Populated reference shape returned by Mongoose .populate() */
export interface PopulatedUser {
  _id:       string;
  name:      string;
  email:     string;
  avatarUrl?: string | null;
}

/** Mirrors the ITask shape returned by the backend (after toJSON transform). */
export interface ApiTask {
  _id:             string;
  projectId:       string;
  sprintId?:       string | null;
  type:            ApiTaskType;
  parentId?:       string | null;
  childIds:        string[];
  title:           string;
  description?:    string | null;
  status:          ApiTaskStatus;
  columnId:        string;
  priority:        ApiTaskPriority;
  storyPoints?:    number | null;
  estimatedHours?: number | null;
  actualHours?:    number | null;
  reporterId:      PopulatedUser | string;
  assigneeId?:     PopulatedUser | string | null;
  watcherIds:      (PopulatedUser | string)[];
  dueDate?:        string | null;
  startedAt?:      string | null;
  completedAt?:    string | null;
  tags:            string[];
  attachmentUrls:  string[];
  order:           number;
  createdAt:       string;
  updatedAt:       string;
}

interface GetTasksResponse {
  tasks: ApiTask[];
  count: number;
}

interface SingleTaskResponse {
  task: ApiTask;
}

// ── Service Methods ───────────────────────────────────────────────────────────

/**
 * Fetches all tasks belonging to a project.
 *
 * Note: the backend requires `projectId` as a query parameter (a user can
 * belong to many projects), so this isn't a true "all tasks ever" fetch —
 * it scopes to the currently active project's board.
 */
export const getTasks = async (projectId: string): Promise<ApiTask[]> => {
  const result = await apiGet<GetTasksResponse>('/tasks', { projectId });
  return result.data.tasks;
};

/**
 * Updates a task's status (i.e. which Kanban column it lives in).
 * `columnId` is kept in sync with `status` automatically by the backend's
 * pre-save hook, so a single PATCH call is all that's needed.
 */
export const updateTaskStatus = async (
  taskId:    string,
  newStatus: ApiTaskStatus
): Promise<ApiTask> => {
  const result = await apiPatch<SingleTaskResponse>(`/tasks/${taskId}`, {
    status: newStatus,
  });
  return result.data.task;
};

export const taskService = {
  getTasks,
  updateTaskStatus,
};

export default taskService;