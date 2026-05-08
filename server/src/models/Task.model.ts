import { Schema, model, Document, Types, HydratedDocument } from 'mongoose';

// ── Enums / Union Types ───────────────────────────────────────────────────────

export type TaskType     = 'epic' | 'story' | 'task' | 'bug' | 'subtask';
export type TaskStatus   = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

// ── Sub-document Interfaces ───────────────────────────────────────────────────

/**
 * Immutable activity log entry.
 * Primary data source for standup.agent and audit trail.
 */
export interface IActivityLog {
  _id:            Types.ObjectId;
  actorId:        Types.ObjectId;
  actorName:      string;
  action:         string;
  field?:         string;
  previousValue?: string;
  nextValue?:     string;
  timestamp:      Date;
  isAIGenerated:  boolean;
}

/**
 * Embedded comment on a task.
 */
export interface ITaskComment {
  _id:           Types.ObjectId;
  authorId:      Types.ObjectId;
  authorName:    string;
  body:          string;
  isAIGenerated: boolean;
  createdAt:     Date;
  editedAt?:     Date;
}

/**
 * AI metadata sub-document.
 * Written exclusively by AI agents — never by direct user input.
 * Powers the scrumMaster, capacity, and RAG agents.
 */
export interface ITaskAIMeta {
  aiGenerated:          boolean;
  generatedFromEpicId?: Types.ObjectId;
  decompositionPrompt?: string;
  confidenceScore?:     number;       // 0.0 – 1.0
  suggestedAssigneeId?: Types.ObjectId;
  assignmentRationale?: string;
  ragEmbedding?:        number[];     // 1536-dim vector for Atlas Vector Search
  embeddingGeneratedAt?: Date;
}

// ── Core Task Interface ───────────────────────────────────────────────────────

export interface ITask extends Document {
  _id:       Types.ObjectId;

  // ── Project / Sprint Context ──────────────────────────────────────────────
  projectId: Types.ObjectId;
  sprintId?: Types.ObjectId;

  // ── Hierarchy ─────────────────────────────────────────────────────────────
  type:       TaskType;
  parentId?:  Types.ObjectId;
  childIds:   Types.ObjectId[];

  // ── Core Fields ───────────────────────────────────────────────────────────
  title:        string;
  description?: string;
  status:       TaskStatus;
  columnId:     string;
  priority:     TaskPriority;
  storyPoints?: number;
  estimatedHours?: number;
  actualHours?:    number;

  // ── People ────────────────────────────────────────────────────────────────
  reporterId:  Types.ObjectId;
  assigneeId?: Types.ObjectId;
  watcherIds:  Types.ObjectId[];

  // ── Dates ─────────────────────────────────────────────────────────────────
  dueDate?:     Date;
  startedAt?:   Date;
  completedAt?: Date;

  // ── Metadata ──────────────────────────────────────────────────────────────
  tags:           string[];
  attachmentUrls: string[];
  order:          number;

  // ── AI Layer ──────────────────────────────────────────────────────────────
  aiMeta: ITaskAIMeta;

  // ── Audit Trail ───────────────────────────────────────────────────────────
  activityLog: Types.DocumentArray<IActivityLog & Document>;
  comments:    Types.DocumentArray<ITaskComment & Document>;

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
  { _id: true }
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
      type:     Boolean,
      required: true,
      default:  false,
    },
    generatedFromEpicId: {
      type:    Schema.Types.ObjectId,
      ref:     'Task',
      default: null,
    },
    decompositionPrompt:  { type: String, default: null },
    confidenceScore: {
      type:    Number,
      min:     0,
      max:     1,
      default: null,
    },
    suggestedAssigneeId: {
      type:    Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },
    assignmentRationale:  { type: String, default: null },
    ragEmbedding: {
      type:    [Number],
      default: undefined,
      // Atlas Vector Search index targets this field:
      // { type: "vector", path: "aiMeta.ragEmbedding",
      //   numDimensions: 1536, similarity: "cosine" }
    },
    embeddingGeneratedAt: { type: Date, default: null },
  },
  { _id: false }
);

// ── Main Task Schema ──────────────────────────────────────────────────────────

const TaskSchema = new Schema<ITask>(
  {
    projectId: {
      type:     Schema.Types.ObjectId,
      ref:      'Project',
      required: [true, 'projectId is required'],
    },

    sprintId: {
      type:    Schema.Types.ObjectId,
      default: null,
    },

    // ── Hierarchy ─────────────────────────────────────────────────────────
    type: {
      type:     String,
      enum:     ['epic', 'story', 'task', 'bug', 'subtask'] satisfies TaskType[],
      required: true,
      default:  'task',
    },

    parentId: {
      type:    Schema.Types.ObjectId,
      ref:     'Task',
      default: null,
    },

    childIds: [{ type: Schema.Types.ObjectId, ref: 'Task' }],

    // ── Core ──────────────────────────────────────────────────────────────
    title: {
      type:      String,
      required:  [true, 'Task title is required'],
      trim:      true,
      maxlength: [250, 'Title cannot exceed 250 characters'],
    },

    description: {
      type:      String,
      trim:      true,
      maxlength: [20000, 'Description cannot exceed 20000 characters'],
      default:   null,
    },

    status: {
      type:     String,
      enum:     ['backlog', 'todo', 'in_progress', 'review', 'done'] satisfies TaskStatus[],
      required: true,
      default:  'backlog',
    },

    columnId: {
      type:     String,
      required: true,
      default:  'backlog',
    },

    priority: {
      type:     String,
      enum:     ['critical', 'high', 'medium', 'low'] satisfies TaskPriority[],
      required: true,
      default:  'medium',
    },

    storyPoints: {
      type:    Number,
      enum:    [0, 1, 2, 3, 5, 8, 13, 21],
      default: null,
    },

    estimatedHours: { type: Number, min: 0, max: 999, default: null },
    actualHours:    { type: Number, min: 0, max: 999, default: null },

    // ── People ────────────────────────────────────────────────────────────
    reporterId: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    assigneeId:  { type: Schema.Types.ObjectId, ref: 'User', default: null },
    watcherIds:  [{ type: Schema.Types.ObjectId, ref: 'User' }],

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
      type:     TaskAIMetaSchema,
      required: true,
      default:  () => ({ aiGenerated: false }),
    },

    // ── Audit Trail ───────────────────────────────────────────────────────
    activityLog: { type: [ActivityLogSchema], default: [] },
    comments:    { type: [TaskCommentSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        // Strip embedding vector — only used internally by vectorstore service
        const aiMeta = ret['aiMeta'] as Record<string, unknown> | undefined;
        if (aiMeta) delete aiMeta['ragEmbedding'];
        delete ret['__v'];
        return ret;
      },
    },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

TaskSchema.index({ projectId: 1, status: 1 });               // Board view
TaskSchema.index({ projectId: 1, sprintId: 1 });             // Sprint board
TaskSchema.index({ assigneeId: 1, status: 1 });              // "My open tasks"
TaskSchema.index({ parentId: 1 });                           // Epic → children
TaskSchema.index({ 'aiMeta.aiGenerated': 1, projectId: 1 }); // AI review queue
TaskSchema.index({ projectId: 1, order: 1 });                // Ordered rendering
TaskSchema.index({ projectId: 1, 'activityLog.timestamp': -1 }); // Standup agent

// ── Pre-save Hook ─────────────────────────────────────────────────────────────

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
    // Keep columnId in sync with status automatically
    this.columnId = this.status;
  }
});

// ── Virtuals ──────────────────────────────────────────────────────────────────

TaskSchema.virtual('cycleTimeHours').get(function (this: ITask) {
  if (!this.startedAt || !this.completedAt) return null;
  return (
    (this.completedAt.getTime() - this.startedAt.getTime()) / (1000 * 60 * 60)
  );
});

TaskSchema.virtual('estimationAccuracy').get(function (this: ITask) {
  if (!this.estimatedHours || !this.actualHours) return null;
  return parseFloat((this.actualHours / this.estimatedHours).toFixed(2));
});

// ── Export ────────────────────────────────────────────────────────────────────

export const TaskModel = model<ITask>('Task', TaskSchema);