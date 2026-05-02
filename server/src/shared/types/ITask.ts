import { Document, Types } from 'mongoose';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type TaskType     = 'epic' | 'story' | 'task' | 'bug' | 'subtask';
export type TaskStatus   = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

// ── Activity Log sub-document ─────────────────────────────────────────────────
// Drives the standup.agent — every state mutation is recorded here.

export interface IActivityLog {
  actorId: Types.ObjectId;            // Ref: User
  action: string;                     // e.g. "moved to In Progress"
  field?: string;                     // Which field changed
  previousValue?: string;
  nextValue?: string;
  timestamp: Date;
  isAIGenerated: boolean;             // Flag AI-originated mutations
}

// ── AI Decomposition Metadata ─────────────────────────────────────────────────
// Written by scrumMaster.agent when decomposing an Epic.

export interface ITaskAIMeta {
  generatedFromEpicId?: Types.ObjectId; // Parent epic that spawned this task
  decompositionPrompt?: string;          // The exact prompt used (audit trail)
  confidenceScore?: number;              // 0–1: agent confidence in decomp
  suggestedAssigneeId?: Types.ObjectId;  // capacity.agent recommendation
  assignmentRationale?: string;          // Why the agent suggested this person
  ragEmbedding?: number[];               // Task content vector for RAG search
  embeddingGeneratedAt?: Date;
}

// ── Core Task Document ────────────────────────────────────────────────────────

export interface ITask extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;          // Ref: Project (indexed)
  sprintId?: Types.ObjectId;          // Ref: Sprint — null = backlog
  
  // Hierarchy
  type: TaskType;
  parentId?: Types.ObjectId;          // Ref: Task — for subtasks & stories under epic
  childIds: Types.ObjectId[];         // Denormalised for fast epic → children queries

  // Core fields
  title: string;
  description?: string;               // Markdown supported
  status: TaskStatus;
  columnId: string;                   // Maps to IKanbanColumn.id
  priority: TaskPriority;
  storyPoints?: number;               // Fibonacci: 1,2,3,5,8,13
  
  // People
  reporterId: Types.ObjectId;         // Ref: User
  assigneeId?: Types.ObjectId;        // Ref: User
  watcherIds: Types.ObjectId[];       // Ref: User[]
  
  // Dates
  dueDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
  
  // Rich metadata
  tags: string[];
  attachmentUrls: string[];
  order: number;                      // Positional order within a column
  
  // AI layer
  aiMeta: ITaskAIMeta;
  
  // Full audit trail for standup generation
  activityLog: IActivityLog[];

  createdAt: Date;
  updatedAt: Date;
}