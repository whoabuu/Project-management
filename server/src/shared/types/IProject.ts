import { Document, Types } from 'mongoose';

// ── Sprint sub-document ───────────────────────────────────────────────────────

export interface ISprint {
  _id: Types.ObjectId;
  name: string;                       // e.g. "Sprint 4"
  startDate: Date;
  endDate: Date;
  goal?: string;                      // AI-generated or PM-written
  isActive: boolean;
  velocity?: number;                  // Story points completed (post-sprint)
}

// ── AI Metadata sub-document ──────────────────────────────────────────────────
// Everything the Scrum Master agent needs to understand project context.

export interface IProjectAIContext {
  techStack: string[];                // e.g. ["React", "Node.js", "MongoDB"]
  domainDescription: string;         // Plain-text: what this project IS
  lastStandupGeneratedAt?: Date;
  standupSummaryHistory: string[];   // Ring-buffer: last N summaries
  embeddingModel: string;            // e.g. "text-embedding-3-small"
}

// ── Kanban Column config ──────────────────────────────────────────────────────

export interface IKanbanColumn {
  id: string;                         // e.g. "todo", "in_progress", "done"
  label: string;
  order: number;
  wipLimit?: number;                  // Work-in-progress cap
}

// ── Core Project Document ─────────────────────────────────────────────────────

export interface IProject extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;                       // URL-safe, unique, indexed
  description?: string;
  ownerId: Types.ObjectId;            // Ref: User
  memberIds: Types.ObjectId[];        // Ref: User[]
  sprints: ISprint[];
  activeSprint?: Types.ObjectId;      // Ref: embedded sprint _id
  columns: IKanbanColumn[];           // Board layout (customisable)
  aiContext: IProjectAIContext;
  isArchived: boolean;

  createdAt: Date;
  updatedAt: Date;
}