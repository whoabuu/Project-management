import { Document, Types } from 'mongoose';

// ── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'project_manager' | 'developer' | 'viewer';

// ── Capacity / AI sub-document ────────────────────────────────────────────────
// This powers the capacity.agent — tracks developer availability for
// intelligent sprint assignment without touching external HR systems.

export interface ICapacityProfile {
  weeklyHoursAvailable: number;       // Self-declared or PM-set
  currentSprintLoad: number;          // Computed: sum of assigned task estimates
  skills: string[];                   // e.g. ["React", "Node", "PostgreSQL"]
  timezone: string;                   // IANA format: "Asia/Kolkata"
  isAvailable: boolean;               // Can be toggled (PTO, blocked)
}

// ── Core User Document ────────────────────────────────────────────────────────

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;                      // Unique, indexed
  passwordHash: string;               // bcrypt — never returned to client
  role: UserRole;
  avatarUrl?: string;
  projectIds: Types.ObjectId[];       // Projects this user belongs to
  capacity: ICapacityProfile;         // AI-driven workload awareness
  
  // Vector RAG — user preference embedding (for future personalisation)
  preferenceEmbedding?: number[];

  createdAt: Date;
  updatedAt: Date;
}