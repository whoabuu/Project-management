import { apiPost } from '../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Mirrors the backend's GeneratedTaskDraft shape (ai.types.ts) after
 * JSON serialization — ObjectIds arrive as plain strings.
 */
export interface DraftTask {
  title:                string;
  description?:         string;
  type:                 'story' | 'task' | 'subtask';
  priority:             'critical' | 'high' | 'medium' | 'low';
  storyPoints?:         number;
  estimatedHours?:      number;
  tags:                 string[];
  suggestedAssigneeId?: string;
  assignmentRationale?: string;
  confidenceScore:      number;
}

/** Mirrors the backend's ScrumMasterOutput shape. */
export interface DecomposeEpicResponse {
  epicId:               string;
  tasks:                DraftTask[];
  decompositionPrompt:  string;
  totalEstimatedHours:  number;
  agentWarnings:        string[];
}

/** Payload shape expected by POST /ai/scrum-master/confirm. */
export interface ConfirmTaskInput {
  title:           string;
  description?:    string;
  type:            'story' | 'task' | 'subtask';
  priority:        'critical' | 'high' | 'medium' | 'low';
  storyPoints?:    number;
  estimatedHours:  number;
  tags:            string[];
  assigneeId?:     string;
  confidenceScore: number;
}

interface ChatResponse {
  reply: string;
}

interface ConfirmTasksResponse {
  tasks: unknown[];
  count: number;
}

// ── Service Methods ───────────────────────────────────────────────────────────

/**
 * Sends a free-form message to the AI Scrum Master chat endpoint.
 */
export const sendMessage = async (content: string): Promise<string> => {
  const result = await apiPost<ChatResponse>('/ai/chat', { message: content });
  return result.data.reply;
};

/**
 * Feeds an Epic to the scrumMaster.agent for decomposition.
 * Returns draft tasks for review — nothing is persisted yet.
 */
export const decomposeEpic = async (
  epicId: string
): Promise<DecomposeEpicResponse> => {
  const result = await apiPost<DecomposeEpicResponse>(
    '/ai/scrum-master/decompose',
    { epicId }
  );
  return result.data;
};

/**
 * Persists the user-reviewed AI-generated tasks to the database.
 *
 * `tasks` accepts the raw DraftTask[] shape from decomposeEpic and maps
 * each one onto the backend's expected ConfirmTaskInput contract —
 * `suggestedAssigneeId` becomes `assigneeId`, and `estimatedHours`
 * defaults to 0 if the agent omitted it.
 */
export const confirmTasks = async (
  epicId: string,
  tasks:  DraftTask[]
): Promise<ConfirmTasksResponse> => {
  const payload: ConfirmTaskInput[] = tasks.map((t) => ({
    title:           t.title,
    description:     t.description,
    type:            t.type,
    priority:        t.priority,
    storyPoints:     t.storyPoints,
    estimatedHours:  t.estimatedHours ?? 0,
    tags:            t.tags,
    assigneeId:      t.suggestedAssigneeId,
    confidenceScore: t.confidenceScore,
  }));

  const result = await apiPost<ConfirmTasksResponse>(
    '/ai/scrum-master/confirm',
    { epicId, tasks: payload }
  );
  return result.data;
};

export const aiService = {
  sendMessage,
  decomposeEpic,
  confirmTasks,
};

export default aiService;