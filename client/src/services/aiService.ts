import { apiPost } from '../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatRequestBody {
  message:   string;
  projectId?: string;
}

interface ChatResponse {
  reply: string;
}

// ── Service Methods ───────────────────────────────────────────────────────────

/**
 * Sends a free-form message to the AI Scrum Master chat endpoint.
 * `projectId` is optional context — when provided, the backend can scope
 * its response to that project's tech stack, team, and active sprint.
 */
export const sendMessage = async (
  content:    string,
  projectId?: string
): Promise<string> => {
  const body: ChatRequestBody = projectId
    ? { message: content, projectId }
    : { message: content };

  const result = await apiPost<ChatResponse>('/ai/chat', body);
  return result.data.reply;
};

export const aiService = {
  sendMessage,
};

export default aiService;