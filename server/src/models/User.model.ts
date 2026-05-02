import { Schema, model, Document, Types } from 'mongoose';

/**
 * Represents a developer's workload capacity profile.
 * This is the primary data source for the capacity.agent when performing
 * intelligent sprint task assignments.
 */
export interface ICapacityProfile {
  /** Self-declared or PM-configured hours available per sprint week. */
  weeklyHoursAvailable: number;

  /**
   * Computed field: sum of estimatedHours across all active assigned tasks.
   * Updated by a post-save hook on the Task model — never set manually.
   */
  currentSprintLoad: number;

  /** Skill tags used by the capacity.agent for competency-based assignment. */
  skills: string[];

  /** IANA timezone string (e.g. "Asia/Kolkata") for standup scheduling. */
  timezone: string;

  /** Toggle for PTO / blockers. Agent will skip unavailable developers. */
  isAvailable: boolean;
}

/**
 * Tracks the last interaction metadata for the RAG conversational agent.
 * Allows the agent to maintain session-aware context per user.
 */
export interface IRAGSession {
  lastQuery?: string;
  lastResponseSummary?: string;
  sessionStartedAt?: Date;
}

// ── Core User Interface ───────────────────────────────────────────────────────

export type UserRole = 'admin' | 'project_manager' | 'developer' | 'viewer';

export interface IUser extends Document {
  _id: Types.ObjectId;

  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  avatarUrl?: string;

  /** Projects this user is a member of (populated by Project model). */
  projectIds: Types.ObjectId[];

  /** AI workload sub-document. Core to the capacity agent. */
  capacity: ICapacityProfile;

  /** Stores the last RAG agent session state for this user. */
  ragSession: IRAGSession;

  /**
   * Pre-computed preference embedding vector.
   * Reserved for Phase 4: personalised task recommendation RAG.
   * Stored as an array of floats (e.g. 1536-dim from text-embedding-3-small).
   */
  preferenceEmbedding?: number[];

  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ── Sub-document Schemas ──────────────────────────────────────────────────────

const CapacityProfileSchema = new Schema<ICapacityProfile>(
  {
    weeklyHoursAvailable: {
      type: Number,
      required: true,
      min: 0,
      max: 80,
      default: 40,
    },
    currentSprintLoad: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    skills: {
      type: [String],
      default: [],
    },
    timezone: {
      type: String,
      required: true,
      default: 'UTC',
    },
    isAvailable: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { _id: false } // Embedded doc — no separate _id needed
);

const RAGSessionSchema = new Schema<IRAGSession>(
  {
    lastQuery: { type: String },
    lastResponseSummary: { type: String },
    sessionStartedAt: { type: Date },
  },
  { _id: false }
);

// ── Main User Schema ──────────────────────────────────────────────────────────

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },

    passwordHash: {
      type: String,
      required: true,
      // Never returned to the client — excluded at query layer via .select('-passwordHash')
    },

    role: {
      type: String,
      enum: ['admin', 'project_manager', 'developer', 'viewer'] satisfies UserRole[],
      required: true,
      default: 'developer',
    },

    avatarUrl: {
      type: String,
      default: null,
    },

    projectIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Project',
      },
    ],

    capacity: {
      type: CapacityProfileSchema,
      required: true,
      default: () => ({
        weeklyHoursAvailable: 40,
        currentSprintLoad: 0,
        skills: [],
        timezone: 'UTC',
        isAvailable: true,
      }),
    },

    ragSession: {
      type: RAGSessionSchema,
      default: () => ({}),
    },

    preferenceEmbedding: {
      type: [Number],
      default: undefined,
      // Atlas Vector Search index will be configured on this field in Phase 4
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt & updatedAt automatically
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        // Strip sensitive fields from any JSON serialization
        delete ret.passwordHash;
        delete ret.preferenceEmbedding;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ projectIds: 1 }); // Fast "all members of project X" queries
UserSchema.index({ 'capacity.isAvailable': 1, 'capacity.currentSprintLoad': 1 }); // Capacity agent queries

// ── Virtual: Available Capacity Hours ─────────────────────────────────────────

UserSchema.virtual('availableHours').get(function (this: IUser) {
  return Math.max(
    0,
    this.capacity.weeklyHoursAvailable - this.capacity.currentSprintLoad
  );
});

// ── Export ────────────────────────────────────────────────────────────────────

export const UserModel = model<IUser>('User', UserSchema);