import { Schema, model, Document, Types, HydratedDocument } from 'mongoose';

// ── Sub-document Interfaces ───────────────────────────────────────────────────

/**
 * Represents a single sprint within a project.
 * Stored as an embedded array on the Project — avoids a separate collection
 * for MVP while keeping sprint data co-located with project context.
 */
export interface ISprint {
  _id: Types.ObjectId;
  name: string;
  goal?: string; // AI-generated or PM-written sprint goal
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  /**
   * Velocity is recorded post-sprint completion.
   * The standup.agent uses historical velocity for estimation accuracy.
   */
  velocity?: number;
}

/**
 * Configures a single column on the Kanban board.
 * Stored on the Project so each project can have a custom board layout.
 */
export interface IKanbanColumn {
  /** Stable string ID used as the foreign key in Task.columnId. */
  id: string;
  label: string;
  /** Visual order of the column (left → right). */
  order: number;
  /** Optional Work-In-Progress cap. Board UI should warn when exceeded. */
  wipLimit?: number;
  /** Colour hex for the column header (e.g. "#6366f1"). */
  color?: string;
}

/**
 * AI context bundle stored on the Project.
 * This is passed as the system-level context to every agent that operates
 * within the scope of this project — ensuring agents are always domain-aware.
 */
export interface IProjectAIContext {
  /**
   * Plain-English summary of what the project does.
   * Injected into the scrumMaster.agent system prompt.
   */
  domainDescription: string;

  /** Tech stack tags (e.g. ["React", "Node.js", "MongoDB"]). */
  techStack: string[];

  /** ISO 639-1 language code for AI output language. Default: "en". */
  preferredLanguage: string;

  /** Timestamp of the last successful standup generation. */
  lastStandupGeneratedAt?: Date;

  /**
   * Rolling history of the last 10 standup summaries (markdown strings).
   * The standup.agent reads this to avoid repetition across consecutive days.
   */
  standupSummaryHistory: string[];

  /**
   * The embedding model used when vectorizing tasks for this project.
   * Stored here so the RAG retriever always uses the correct model.
   * Example: "text-embedding-3-small"
   */
  embeddingModel: string;

  /**
   * Target story points per sprint, learned from historical velocity.
   * Used by the capacity.agent to throttle Epic decomposition granularity.
   */
  targetSprintVelocity?: number;
}

// ── Core Project Interface ────────────────────────────────────────────────────

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';

export interface IProject extends Document {
  _id: Types.ObjectId;

  name: string;
  /** URL-safe unique slug, auto-generated from name. Used in route params. */
  slug: string;
  description?: string;
  status: ProjectStatus;
  coverImageUrl?: string;

  /** The user who created and owns the project. */
  ownerId: Types.ObjectId;

  /** All project members. Used by the capacity.agent for assignment queries. */
  memberIds: Types.ObjectId[];

  /** Embedded sprint documents. Max recommended: 50 sprints before archiving. */
  sprints: Types.DocumentArray<ISprint & Document>;

  /** Reference to the currently active sprint's _id within the sprints array. */
  activeSprint?: Types.ObjectId;

  /** Ordered Kanban column configuration. Customisable per project. */
  columns: IKanbanColumn[];

  /** AI system context — injected into every agent operating on this project. */
  aiContext: IProjectAIContext;

  createdAt: Date;
  updatedAt: Date;
}

// ── Default Kanban Columns ────────────────────────────────────────────────────

const DEFAULT_COLUMNS: IKanbanColumn[] = [
  { id: 'backlog',     label: 'Backlog',     order: 0, color: '#64748b' },
  { id: 'todo',        label: 'To Do',       order: 1, color: '#6366f1' },
  { id: 'in_progress', label: 'In Progress', order: 2, color: '#f59e0b', wipLimit: 4 },
  { id: 'review',      label: 'In Review',   order: 3, color: '#8b5cf6' },
  { id: 'done',        label: 'Done',        order: 4, color: '#10b981' },
];

// ── Sub-document Schemas ──────────────────────────────────────────────────────

const SprintSchema = new Schema<ISprint>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    goal: { type: String, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: false },
    velocity: { type: Number, min: 0, default: null },
  },
  { timestamps: false }
  // _id IS generated here (default) — needed for activeSprint reference
);

const KanbanColumnSchema = new Schema<IKanbanColumn>(
  {
    id:       { type: String, required: true },
    label:    { type: String, required: true, trim: true },
    order:    { type: Number, required: true },
    wipLimit: { type: Number, min: 1, default: null },
    color:    { type: String, default: '#64748b' },
  },
  { _id: false }
);

const ProjectAIContextSchema = new Schema<IProjectAIContext>(
  {
    domainDescription: {
      type: String,
      required: true,
      default: '',
      maxlength: [2000, 'Domain description cannot exceed 2000 characters'],
    },
    techStack: { type: [String], default: [] },
    preferredLanguage: { type: String, default: 'en' },
    lastStandupGeneratedAt: { type: Date, default: null },
    standupSummaryHistory: {
      type: [String],
      default: [],
      // Application layer must enforce a max of 10 items (ring buffer logic)
    },
    embeddingModel: {
      type: String,
      default: 'text-embedding-3-small',
    },
    targetSprintVelocity: { type: Number, min: 0, default: null },
  },
  { _id: false }
);

// ── Main Project Schema ───────────────────────────────────────────────────────

const ProjectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [120, 'Project name cannot exceed 120 characters'],
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: null,
    },

    status: {
      type: String,
      enum: ['active', 'on_hold', 'completed', 'archived'] satisfies ProjectStatus[],
      default: 'active',
    },

    coverImageUrl: { type: String, default: null },

    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    memberIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    sprints: { type: [SprintSchema], default: [] },

    activeSprint: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    columns: {
      type: [KanbanColumnSchema],
      default: DEFAULT_COLUMNS,
    },

    aiContext: {
      type: ProjectAIContextSchema,
      required: true,
      default: () => ({
        domainDescription: '',
        techStack: [],
        preferredLanguage: 'en',
        standupSummaryHistory: [],
        embeddingModel: 'text-embedding-3-small',
      }),
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret:Record<string, any>) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

ProjectSchema.index({ slug: 1 }, { unique: true });
ProjectSchema.index({ ownerId: 1 });
ProjectSchema.index({ memberIds: 1 }); // "All projects for user X"
ProjectSchema.index({ status: 1 });

// ── Virtuals ──────────────────────────────────────────────────────────────────

/** Convenience: total number of sprints without loading the full array. */
ProjectSchema.virtual('sprintCount').get(function (this: HydratedDocument<IProject>) {
  return (this.sprints as unknown as any[]).length;
});

ProjectSchema.virtual('memberCount').get(function (this: IProject) {
  return this.memberIds.length;
});

// ── Export ────────────────────────────────────────────────────────────────────

export const ProjectModel = model<IProject>('Project', ProjectSchema);