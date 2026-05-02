import { Schema, model, Document, Types, HydratedDocument } from 'mongoose';

// ── Enums / Union Types ───────────────────────────────────────────────────────

export type TaskType     = 'epic' | 'story' | 'task' | 'bug' | 'subtask';
export type TaskStatus   = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

// ── Sub-document Interfaces ───────────────────────────────────────────────────

/**
 * Immutable activity log entry. Every state-changing mutation on a Task
 * appends a record here. This is the PRIMARY data source for:
 *  - standup.agent (summarises "what changed yesterday")
 *  - Audit trail / compliance
 */
export interface IActivityLog {
  _id: Types.ObjectId;
  /** The user (or system/AI) who performed the action. */
  actorId: Types.ObjectId;
  actorName: string; // Denormalised to avoid populate() on every standup query
  /** Human-readable action string (e.g. "moved to In Progress", "assigned to Alice"). */
  action: string;
  /** Which field was mutated. Undefined for creation events. */
  field?: string;
  previousValue?: string;
  nextValue?: string;
  timestamp: Date;
  /**
   * TRUE when the action was performed by an AI agent.
   * The standup.agent filters on this to distinguish human vs AI activity,
   * preventing recursive summarisation loops.
   */
  isAIGenerated: boolean;
}

/**
 * A single comment on a task.
 * Embedded for MVP — can be extracted to its own collection if threads grow large.
 */
export interface ITaskComment {
  _id: Types.ObjectId;
  authorId: Types.ObjectId;
  authorName: string; // Denormalised
  body: string;       // Markdown
  isAIGenerated: boolean;
  createdAt: Date;
  editedAt?: Date;
}

/**
 * AI Metadata sub-document.
 * Written exclusively by AI agents — never by direct user input.
 * This is the brain-state of the scrumMaster & capacity agents for this task.
 */
export interface ITaskAIMeta {
  /**
   * Set TRUE when the scrumMaster.agent created this task via Epic decomposition.
   * Allows filtering "AI-generated tasks" for review workflows.
   */
  aiGenerated: boolean;

  /** The Epic task ID that spawned this task (if aiGenerated = true). */
  generatedFromEpicId?: Types.ObjectId;

  /**
   * The exact LangChain prompt used to generate this task (stored for auditability).
   * Allows replaying or debugging agent decomposition decisions.
   */
  decompositionPrompt?: string;

  /**
   * Agent's confidence score for this decomposition (0.0 – 1.0).
   * Tasks below a threshold (e.g. < 0.6) could be flagged for PM review.
   */
  confidenceScore?: number;

  /**
   * The user the capacity.agent recommended for assignment.
   * Distinct from assigneeId — a PM may override this recommendation.
   */
  suggestedAssigneeId?: Types.ObjectId;

  /**
   * Plain-English rationale from the capacity.agent explaining WHY it
   * suggested this assignee (e.g. "Alice has React skills and 12h available").
   */
  assignmentRationale?: string;

  /**
   * Pre-computed embedding vector for this task's title + description.
   * Used by the RAG agent (rag.agent.ts) for semantic board search.
   * Stored directly in MongoDB → Atlas Vector Search. No separate vector DB at MVP.
   * Typical dimension: 1536 (text-embedding-3-small).
   */
  ragEmbedding?: number[];

  /** Timestamp of last embedding computation — used to detect stale vectors. */
  embeddingGeneratedAt?: Date;
}

// ── Core Task Interface ───────────────────────────────────────────────────────

export interface ITask extends Document {
  _id: Types.ObjectId;

  // ── Project / Sprint Context ──────────────────────────────────────────────
  projectId: Types.ObjectId;
  sprintId?: Types.ObjectId; // Null = backlog (not yet assigned to a sprint)

  // ── Hierarchy ─────────────────────────────────────────────────────────────
  type: TaskType;
  /**
   * Reference to the parent task (Story under Epic, Subtask under Story).
   * Null for top-level Epics and standalone Tasks.
   */
  parentId?: Types.ObjectId;
  /**
   * Denormalised children array for O(1) "give me all subtasks of this Epic"
   * without a reverse lookup query.
   */
  childIds: Types.ObjectId[];

  // ── Core Fields ───────────────────────────────────────────────────────────
  title: string;
  description?: string; // Markdown
  status: TaskStatus;
  /** Maps to IKanbanColumn.id on the parent Project. String FK — no join needed. */
  columnId: string;
  priority: TaskPriority;

  /**
   * Fibonacci story points: 0, 1, 2, 3, 5, 8, 13, 21.
   * Used for sprint velocity calculation and capacity planning.
   */
  storyPoints?: number;

  /**
   * Estimated effort in hours — the capacity.agent uses this (not storyPoints)
   * for precise load calculation against ICapacityProfile.weeklyHoursAvailable.
   */
  estimatedHours?: number;

  /**
   * Actual hours logged by the developer post-completion.
   * Delta between estimatedHours and actualHours feeds future estimation accuracy.
   */
  actualHours?: number;

  // ── People ────────────────────────────────────────────────────────────────
  reporterId: Types.ObjectId;
  assigneeId?: Types.ObjectId;
  watcherIds: Types.ObjectId[];

  // ── Dates ─────────────────────────────────────────────────────────────────
  dueDate?: Date;
  startedAt?: Date;   // Set when status → 'in_progress'
  completedAt?: Date; // Set when status → 'done'

  // ── Metadata ──────────────────────────────────────────────────────────────
  tags: string[];
  attachmentUrls: string[];
  /**
   * Positional order within the column for drag-and-drop re-ordering.
   * Fractional indexing is recommended at the service layer to avoid bulk updates.
   */
  order: number;

  // ── AI Layer ──────────────────────────────────────────────────────────────
  aiMeta: ITaskAIMeta;

  // ── Audit Trail ───────────────────────────────────────────────────────────
  activityLog: Types.DocumentArray<IActivityLog & Document>;
  comments: Types.DocumentArray<ITaskComment & Document>;

  createdAt: Date;
  updatedAt: Date;
}

// ── Sub-document Schemas ──────────────────────────────────────────────────────

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    actorId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorName:     { type: String, required: true },
    action:        { type: String, required: true, trim: true },
    field:         { type: String, default: null },
    previousValue: { type: String, default: null },
    nextValue:     { type: String, default: null },
    timestamp:     { type: Date, required: true, default: () => new Date() },
    isAIGenerated: { type: Boolean, required: true, default: false },
  },
  { _id: true } // Keep _id — useful for deduplication checks
);

const TaskCommentSchema = new Schema<ITaskComment>(
  {
    authorId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName:    { type: String, required: true },
    body:          { type: String, required: true, trim: true, maxlength: 5000 },
    isAIGenerated: { type: Boolean, default: false },
    createdAt:     { type: Date, default: () => new Date() },
    editedAt:      { type: Date, default: null },
  },
  { _id: true }
);

const TaskAIMetaSchema = new Schema<ITaskAIMeta>(
  {
    aiGenerated: {
      type: Boolean,
      required: true,
      default: false,
    },
    generatedFromEpicId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    decompositionPrompt: { type: String, default: null },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    suggestedAssigneeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignmentRationale: { type: String, default: null },
    ragEmbedding: {
      type: [Number],
      default: undefined,
      // Atlas Vector Search index will target this field.
      // Index config (in Atlas UI or IaC):
      //   { "fields": [{ "type": "vector", "path": "aiMeta.ragEmbedding",
      //                  "numDimensions": 1536, "similarity": "cosine" }] }
    },
    embeddingGeneratedAt: { type: Date, default: null },
  },
  { _id: false }
);

// ── Main Task Schema ──────────────────────────────────────────────────────────

const TaskSchema = new Schema<ITask>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'projectId is required'],
    },

    sprintId: {
      type: Schema.Types.ObjectId,
      ref: 'Project.sprints', // Logical ref — sprints are embedded on Project
      default: null,
    },

    // ── Hierarchy ─────────────────────────────────────────────────────────
    type: {
      type: String,
      enum: ['epic', 'story', 'task', 'bug', 'subtask'] satisfies TaskType[],
      required: true,
      default: 'task',
    },

    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },

    childIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Task',
      },
    ],

    // ── Core ──────────────────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [250, 'Title cannot exceed 250 characters'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [20000, 'Description cannot exceed 20000 characters'],
      default: null,
    },

    status: {
      type: String,
      enum: ['backlog', 'todo', 'in_progress', 'review', 'done'] satisfies TaskStatus[],
      required: true,
      default: 'backlog',
    },

    columnId: {
      type: String,
      required: true,
      default: 'backlog',
    },

    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'] satisfies TaskPriority[],
      required: true,
      default: 'medium',
    },

    storyPoints: {
      type: Number,
      enum: [0, 1, 2, 3, 5, 8, 13, 21],
      default: null,
    },

    estimatedHours: {
      type: Number,
      min: 0,
      max: 999,
      default: null,
    },

    actualHours: {
      type: Number,
      min: 0,
      max: 999,
      default: null,
    },

    // ── People ────────────────────────────────────────────────────────────
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    watcherIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // ── Dates ─────────────────────────────────────────────────────────────
    dueDate:     { type: Date, default: null },
    startedAt:   { type: Date, default: null },
    completedAt: { type: Date, default: null },

    // ── Metadata ──────────────────────────────────────────────────────────
    tags:           { type: [String], default: [] },
    attachmentUrls: { type: [String], default: [] },
    order:          { type: Number, required: true, default: 0 },

    // ── AI Layer ──────────────────────────────────────────────────────────
    aiMeta: {
      type: TaskAIMetaSchema,
      required: true,
      default: () => ({ aiGenerated: false }),
    },

    // ── Audit Trail ───────────────────────────────────────────────────────
    activityLog: { type: [ActivityLogSchema], default: [] },
    comments:    { type: [TaskCommentSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        // Strip the large embedding vector from API responses —
        // it's only ever needed by the vectorstore service internally.
        if (ret.aiMeta) delete ret.aiMeta.ragEmbedding;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Core query patterns
TaskSchema.index({ projectId: 1, status: 1 });             // Board view: all tasks for project by status
TaskSchema.index({ projectId: 1, sprintId: 1 });           // Sprint board view
TaskSchema.index({ assigneeId: 1, status: 1 });            // "My open tasks" view
TaskSchema.index({ parentId: 1 });                         // Fetch all children of an Epic
TaskSchema.index({ 'aiMeta.aiGenerated': 1, projectId: 1 }); // "Show AI-generated tasks for review"
TaskSchema.index({ projectId: 1, order: 1 });              // Ordered board rendering

// Compound index for standup agent: "what changed in project X since timestamp Y?"
TaskSchema.index({ projectId: 1, 'activityLog.timestamp': -1 });

// ── Middleware (Mongoose Hooks) ───────────────────────────────────────────────

/**
 * Pre-save hook: auto-set startedAt and completedAt timestamps
 * based on status transitions. These power the burndown chart later.
 */
TaskSchema.pre<HydratedDocument<ITask>>('save', async function () {
  if (this.isModified('status')) {
    if (this.status === 'in_progress' && !this.startedAt) {
      this.startedAt = new Date();
    }
    if (this.status === 'done' && !this.completedAt) {
      this.completedAt = new Date();
    }
    if (this.status !== 'done') {
      this.completedAt = undefined;
    }
  }
});

// ── Virtuals ──────────────────────────────────────────────────────────────────

/** Cycle time in hours: how long from start to completion. */
TaskSchema.virtual('cycleTimeHours').get(function (this: ITask) {
  if (!this.startedAt || !this.completedAt) return null;
  return (
    (this.completedAt.getTime() - this.startedAt.getTime()) / (1000 * 60 * 60)
  );
});

/** Estimation accuracy ratio (actual / estimated). 1.0 = perfect estimate. */
TaskSchema.virtual('estimationAccuracy').get(function (this: ITask) {
  if (!this.estimatedHours || !this.actualHours) return null;
  return parseFloat((this.actualHours / this.estimatedHours).toFixed(2));
});

// ── Export ────────────────────────────────────────────────────────────────────

export const TaskModel = model<ITask>('Task', TaskSchema);