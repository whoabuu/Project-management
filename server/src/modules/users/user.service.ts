import { Types } from 'mongoose';
import { UserModel, IUser } from '../../models/User.model';
import { AppError } from '../../middleware/error.middleware';
import { UpdateProfileInput, SearchUsersInput } from './user.routes';
import { PaginationMeta } from '../../shared/types/api.types';

// ── Safe Public User Shape ────────────────────────────────────────────────────

/**
 * Public profile — returned by the search endpoint.
 * Never includes passwordHash, preferenceEmbedding, or ragSession.
 */
export interface PublicUser {
  _id:       Types.ObjectId;
  name:      string;
  email:     string;
  role:      IUser['role'];
  avatarUrl: string | undefined | null;
  capacity: {
    skills:               string[];
    isAvailable:          boolean;
    weeklyHoursAvailable: number;
    currentSprintLoad:    number;
    timezone:             string;
  };
  createdAt: Date;
}

/**
 * Full private profile — returned only to the authenticated user themselves.
 * Adds projectIds and lastLoginAt on top of the public shape.
 */
export interface PrivateUser extends PublicUser {
  projectIds:  Types.ObjectId[];
  lastLoginAt: Date | undefined | null;
  updatedAt:   Date;
}

// ── Field Selector ────────────────────────────────────────────────────────────

/**
 * Fields selected for the private /me response.
 * passwordHash and preferenceEmbedding are explicitly excluded.
 */
const PRIVATE_SELECT =
  '_id name email role avatarUrl capacity projectIds lastLoginAt createdAt updatedAt';

/**
 * Fields selected for the public search response.
 * Intentionally omits projectIds, lastLoginAt, ragSession.
 */
const PUBLIC_SELECT =
  '_id name email role avatarUrl capacity.skills capacity.isAvailable capacity.weeklyHoursAvailable capacity.currentSprintLoad capacity.timezone createdAt';

// ── Mappers ───────────────────────────────────────────────────────────────────

const toPrivateUser = (user: IUser): PrivateUser => ({
  _id:        user._id,
  name:       user.name,
  email:      user.email,
  role:       user.role,
  avatarUrl:  user.avatarUrl,
  capacity: {
    skills:               user.capacity.skills,
    isAvailable:          user.capacity.isAvailable,
    weeklyHoursAvailable: user.capacity.weeklyHoursAvailable,
    currentSprintLoad:    user.capacity.currentSprintLoad,
    timezone:             user.capacity.timezone,
  },
  projectIds:  user.projectIds,
  lastLoginAt: user.lastLoginAt,
  createdAt:   user.createdAt,
  updatedAt:   user.updatedAt,
});

// ── Service Methods ───────────────────────────────────────────────────────────

/**
 * Returns the full private profile of the logged-in user.
 */
export const getMe = async (userId: Types.ObjectId): Promise<PrivateUser> => {
  const user = await UserModel
    .findById(userId)
    .select(PRIVATE_SELECT)
    .lean();

  if (!user) throw new AppError('User not found.', 404);

  return toPrivateUser(user as unknown as IUser);
};

/**
 * Updates the logged-in user's mutable profile fields.
 *
 * Capacity sub-fields are merged individually so a partial update
 * (e.g. only changing `skills`) does not wipe other capacity fields.
 */
export const updateMe = async (
  userId: Types.ObjectId,
  input: UpdateProfileInput
): Promise<PrivateUser> => {
  const user = await UserModel.findById(userId).select(PRIVATE_SELECT);

  if (!user) throw new AppError('User not found.', 404);

  // ── Apply top-level field updates ─────────────────────────────────────────
  if (input.name      !== undefined) user.name      = input.name;
  if (input.avatarUrl !== undefined) {
    user.avatarUrl = input.avatarUrl ?? undefined;
  }

  // ── Merge capacity sub-fields individually ────────────────────────────────
  if (input.capacity !== undefined) {
    const { weeklyHoursAvailable, skills, timezone, isAvailable } =
      input.capacity;

    if (weeklyHoursAvailable !== undefined) {
      user.capacity.weeklyHoursAvailable = weeklyHoursAvailable;
    }
    if (skills      !== undefined) user.capacity.skills      = skills;
    if (timezone    !== undefined) user.capacity.timezone    = timezone;
    if (isAvailable !== undefined) user.capacity.isAvailable = isAvailable;
  }

  await user.save();

  return toPrivateUser(user);
};

/**
 * Searches users by name or email (partial, case-insensitive).
 * Can be further filtered by skill, role, and availability.
 *
 * Returns only public-safe fields — never passwords or embeddings.
 * Supports pagination for large teams.
 */
export const searchUsers = async (
  input: SearchUsersInput,
  requesterId: Types.ObjectId
): Promise<{ users: PublicUser[]; pagination: PaginationMeta }> => {
  const { q, skill, role, isAvailable, limit, page } = input;

  // ── Build query filter ────────────────────────────────────────────────────
  const filter: Record<string, unknown> = {
    // Never return the requesting user in search results
    _id:      { $ne: requesterId },
    isActive: true,
  };

  // Partial text search across name AND email using a single $or
  if (q) {
    const regex = new RegExp(q, 'i'); // Case-insensitive partial match
    filter['$or'] = [
      { name:  regex },
      { email: regex },
    ];
  }

  // Skill filter — checks if the skills array contains the queried skill
  if (skill) {
    filter['capacity.skills'] = {
      $regex:   new RegExp(skill, 'i'),
      $options: 'i',
    };
  }

  if (role)        filter['role']                   = role;
  if (isAvailable !== undefined) {
    filter['capacity.isAvailable'] = isAvailable;
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  const skip  = (page - 1) * limit;
  const total = await UserModel.countDocuments(filter);

  const users = await UserModel
    .find(filter)
    .select(PUBLIC_SELECT)
    .sort({ name: 1 }) // Alphabetical — predictable for invite lists
    .skip(skip)
    .limit(limit)
    .lean();

  const pagination: PaginationMeta = {
    total,
    page,
    limit,
    totalPages:  Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPrevPage: page > 1,
  };

  // Map lean documents to typed PublicUser shape
  const publicUsers: PublicUser[] = users.map((u) => ({
    _id:       u._id,
    name:      u.name,
    email:     u.email,
    role:      u.role,
    avatarUrl: u.avatarUrl,
    capacity: {
      skills:               u.capacity.skills,
      isAvailable:          u.capacity.isAvailable,
      weeklyHoursAvailable: u.capacity.weeklyHoursAvailable,
      currentSprintLoad:    u.capacity.currentSprintLoad,
      timezone:             u.capacity.timezone,
    },
    createdAt: u.createdAt,
  }));

  return { users: publicUsers, pagination };
};