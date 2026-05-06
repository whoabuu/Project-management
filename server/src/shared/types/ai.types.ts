import { Types } from 'mongoose';

/**
 * Shared I/O contracts for all LangChain agents.
 * Controllers pass these in; agents return them.
 * Never use `any` — every agent interaction is fully typed.
 */

// ── Scrum Master Agent ────────────────────────────────────────────────────────

export interface ScrumMasterInput {
  epicId: Types.ObjectId;
  epicTitle: string;
  epicDescription: string;
  projectContext: {
    techStack: string[];
    domainDescription: string;
    targetSprintVelocity?: number;
  };
  teamMembers: Array<{
    userId: Types.ObjectId;
    name: string;
    skills: string[];
    availableHours: number;
  }>;
}

export interface GeneratedTaskDraft {
  title: string;
  description: string;
  type: 'story' | 'task' | 'subtask';
  priority: 'critical' | 'high' | 'medium' | 'low';
  storyPoints?: number;
  estimatedHours?: number;
  tags: string[];
  suggestedAssigneeId?: Types.ObjectId;
  assignmentRationale?: string;
  confidenceScore: number;
}

export interface ScrumMasterOutput {
  epicId: Types.ObjectId;
  tasks: GeneratedTaskDraft[];
  decompositionPrompt: string; // The full prompt used — stored for audit
  totalEstimatedHours: number;
  agentWarnings: string[];     // e.g. "Sprint velocity may be exceeded"
}

// ── Standup Agent ─────────────────────────────────────────────────────────────

export interface StandupInput {
  projectId: Types.ObjectId;
  projectName: string;
  sinceTimestamp: Date;      // Summarise activity after this point
  activityEvents: Array<{
    actorName: string;
    action: string;
    taskTitle: string;
    isAIGenerated: boolean;
    timestamp: Date;
  }>;
  previousSummaries: string[]; // Last N summaries to avoid repetition
}

export interface StandupOutput {
  summary: string;           // Markdown-formatted standup report
  blockers: string[];
  completedItems: string[];
  inProgressItems: string[];
  generatedAt: Date;
}

// ── RAG Agent ─────────────────────────────────────────────────────────────────

export interface RAGQueryInput {
  query: string;
  projectId: Types.ObjectId;
  userId: Types.ObjectId;
}

export interface RAGQueryOutput {
  answer: string;            // Natural language response
  matchedTaskIds: Types.ObjectId[];
  sources: Array<{
    taskId: Types.ObjectId;
    taskTitle: string;
    relevanceScore: number;
  }>;
}

// ── Capacity Agent ────────────────────────────────────────────────────────────

export interface CapacityCheckInput {
  projectId: Types.ObjectId;
  sprintId: Types.ObjectId;
  taskEstimatedHours: number;
  requiredSkills: string[];
  candidateIds: Types.ObjectId[];
}

export interface CapacityCheckOutput {
  recommendedAssigneeId: Types.ObjectId | null;
  rationale: string;
  alternativeIds: Types.ObjectId[];
  isSprintOverCapacity: boolean;
}