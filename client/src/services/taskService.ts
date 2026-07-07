import { apiGet, apiPatch, apiPost } from '../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ApiTaskType     = 'epic' | 'story' | 'task' | 'bug' | 'subtask';
export type ApiTaskStatus   = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type ApiTaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface PopulatedUser {
  _id:       string;
  name:      string;
  email:     string;
  avatarUrl?: string | null;
}

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

export interface CreateTaskPayload {
  projectId:      string;
  title:          string;
  description?:   string;
  type:           ApiTaskType;
  status:         ApiTaskStatus;
  priority:       ApiTaskPriority;
  storyPoints?:   number;
  tags?:          string[];
}

interface GetTasksResponse {
  tasks: ApiTask[];
  count: number;
}

interface SingleTaskResponse {
  task: ApiTask;
}

// ── Service Methods ───────────────────────────────────────────────────────────

export const getTasks = async (projectId: string): Promise<ApiTask[]> => {
  const result = await apiGet<GetTasksResponse>('/tasks', { projectId });
  return result.data.tasks;
};

export const updateTaskStatus = async (
  taskId:    string,
  newStatus: ApiTaskStatus
): Promise<ApiTask> => {
  const result = await apiPatch<SingleTaskResponse>(`/tasks/${taskId}`, {
    status: newStatus,
  });
  return result.data.task;
};

/**
 * Creates a new task on the backend.
 * `columnId` is automatically derived from `status` by the backend pre-save hook.
 */
export const createTask = async (
  payload: CreateTaskPayload
): Promise<ApiTask> => {
  const result = await apiPost<SingleTaskResponse>('/tasks', payload);
  return result.data.task;
};

export const taskService = {
  getTasks,
  updateTaskStatus,
  createTask,
};

export default taskService;