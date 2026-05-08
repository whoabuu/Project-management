import { Schema, model, Document, Types, HydratedDocument } from 'mongoose';

// ── Sub-document Interfaces ───────────────────────────────────────────────────

/**
 * A project member entry with an explicit role.
 * Stored as an embedded array on the Project document so a single query
 * returns the full team without a separate collection join.
 */
export interface IProjectMember {
  userId: Types.ObjectId;
  role: 'project_manager' | 'developer' | 'viewer';
  joinedAt: Date;
}

/**
 * Represents a single sprint within a project.
 */
export interface ISprint {
  _id: Types.ObjectId;
  name: string;
  goal?: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  velocity?: number;
}

/**
 * Configures a single Kanban board column.
 */
export interface IKanbanColumn {
  id: string;
  label: string;
  order: number;
  wipLimit?: number;
  color?: string;
}

/**
 * AI context bundle — injected into every agent operating on this project.
 */
export interface IProjectAIContext {
  domainDescription: string;
  techStack: string[];
  preferredLanguage: string;
  lastStandupGeneratedAt?: Date;
  standupSummaryHistory: string[];
  embeddingModel: string;
  targetSprintVelocity?: number;
}

// ── Core Project Interface ────────────────────────────────────────────────────

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';

export interface IProject extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  status: ProjectStatus;
  coverImageUrl?: string;

  /** The user who created and owns the project — has full control. */
  ownerId: Types.ObjectId;

  /**
   * Embedded member list with per-member roles.
   * The owner is NOT duplicated here — ownership is checked via ownerId.
   * Service layer enforces: owner always has implicit full access.
   */
  members: Types.DocumentArray<IProjectMember & Document>;

  sprints: Types.DocumentArray<ISprint & Document>;
  activeSprint?: Types.ObjectId;
  columns: IKanbanColumn[];
  aiContext: IProjectAIContext;

  createdAt: Date;
  updatedAt: Date;
}

// ── Default Columns ───────────────────────────────────────────────────────────

const DEFAULT_COLUMNS: IKanbanColumn[] = [
  { id: 'backlog',     label: 'Backlog',     order: 0, color: '#64748b' },
  { id: 'todo',        label: 'To Do',       order: 1, color: '#6366f1' },
  { id: 'in_progress', label: 'In Progress', order: 2, color: '#f59e0b', wipLimit: 4 },
  { id: 'review',      label: 'In Review',   order: 3, color: '#8b5cf6' },
  { id: 'done',        label: 'Done',        order: 4, color: '#10b981' },
];

// ── Sub-document Schemas ──────────────────────────────────────────────────────

const ProjectMemberSchema = new Schema<IProjectMember>(
  {
    userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['project_manager', 'developer', 'viewer'],
      required: true,
      default: 'developer',
    },
    joinedAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const SprintSchema = new Schema<ISprint>(
  {
    name:      { type: String, required: true, trim: true },
    goal:      { type: String, trim: true, default: null },
    startDate: { type: Date, required: true },
    endDate:   { type: Date, required: true },
    isActive:  { type: Boolean, default: false },
    velocity:  { type: Number, min: 0, default: null },
  }
  // _id IS generated — needed for activeSprint reference
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
    domainDescription:       { type: String, default: '', maxlength: 2000 },
    techStack:               { type: [String], default: [] },
    preferredLanguage:       { type: String, default: 'en' },
    lastStandupGeneratedAt:  { type: Date, default: null },
    standupSummaryHistory:   { type: [String], default: [] },
    embeddingModel:          { type: String, default: 'text-embedding-3-small' },
    targetSprintVelocity:    { type: Number, min: 0, default: null },
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

    members: { type: [ProjectMemberSchema], default: [] },

    sprints: { type: [SprintSchema], default: [] },

    activeSprint: { type: Schema.Types.ObjectId, default: null },

    columns: { type: [KanbanColumnSchema], default: DEFAULT_COLUMNS },

    aiContext: {
      type: ProjectAIContextSchema,
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
     transform: (_doc, ret: Record<string, unknown>) => {
       delete ret['__v'];
       return ret;
     },
    },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

ProjectSchema.index({ slug: 1 }, { unique: true });
ProjectSchema.index({ ownerId: 1 });
ProjectSchema.index({ 'members.userId': 1 }); // "All projects for user X"
ProjectSchema.index({ status: 1 });

// ── Pre-save Hook: Auto-generate slug ─────────────────────────────────────────

ProjectSchema.pre<HydratedDocument<IProject>>('validate', async function () {
  if (this.isNew || this.isModified('name')) {
    const base = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80);

    const suffix = Math.random().toString(36).slice(2, 7);
    this.slug = `${base}-${suffix}`;
  }
});

// ── Virtuals ──────────────────────────────────────────────────────────────────

ProjectSchema.virtual('memberCount').get(function (this: IProject) {
  return this.members.length;
});

ProjectSchema.virtual('sprintCount').get(function (this: IProject) {
  return this.sprints.length;
});

// ── Export ────────────────────────────────────────────────────────────────────

export const ProjectModel = model<IProject>('Project', ProjectSchema);