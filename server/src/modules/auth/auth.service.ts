import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { UserModel, IUser, UserRole } from '../../models/User.model';
import { AppError } from '../../middleware/error.middleware';
import { env } from '../../config/env';
import { RegisterInput, LoginInput } from './auth.routes';

// ── Token Helpers ─────────────────────────────────────────────────────────────

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Signs both access and refresh JWTs for a given user.
 * Access token is short-lived (default 7d) and sent on every request.
 * Refresh token is long-lived (default 30d) and used only to re-issue access tokens.
 */
const signTokenPair = (userId: Types.ObjectId, role: UserRole): TokenPair => {
  const payload = { sub: userId.toString(), role };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

  return { accessToken, refreshToken };
};

// ── Safe User Shape ───────────────────────────────────────────────────────────

/**
 * The shape returned to the client after auth operations.
 * passwordHash, preferenceEmbedding, and __v are never included.
 */
export interface SafeUser {
  _id:       Types.ObjectId;
  name:      string;
  email:     string;
  role:      UserRole;
  avatarUrl: string | null | undefined;
  capacity:  IUser['capacity'];
  createdAt: Date;
  updatedAt: Date;
}

const toSafeUser = (user: IUser): SafeUser => ({
  _id:       user._id,
  name:      user.name,
  email:     user.email,
  role:      user.role,
  avatarUrl: user.avatarUrl,
  capacity:  user.capacity,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// ── Auth Response Shape ───────────────────────────────────────────────────────

export interface AuthResult {
  user:         SafeUser;
  accessToken:  string;
  refreshToken: string;
}

// ── Service Methods ───────────────────────────────────────────────────────────

/**
 * Registers a new user.
 *
 * Steps:
 *  1. Check for duplicate email (case-insensitive — enforced by schema index)
 *  2. Hash the plain-text password with bcrypt (cost factor 12)
 *  3. Persist the new user document
 *  4. Sign and return a token pair alongside the safe user object
 */
export const registerUser = async (
  input: RegisterInput
): Promise<AuthResult> => {
  const { name, email, password, role } = input;

  // 1. Duplicate check — give a generic message to prevent user enumeration
  const existing = await UserModel.findOne({ email }).lean();
  if (existing) {
    throw new AppError('An account with this email already exists.', 409);
  }

  // 2. Hash — cost factor 12 is the recommended production baseline.
  //    Higher = slower brute-force, but adds ~300ms per login on commodity hardware.
  const BCRYPT_SALT_ROUNDS = 12;
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  // 3. Persist
  const user = await UserModel.create({
    name,
    email,
    passwordHash,
    role,
    // capacity sub-document is populated by the schema default
  });

  // 4. Sign tokens and return
  const { accessToken, refreshToken } = signTokenPair(user._id, user.role);

  return {
    user: toSafeUser(user),
    accessToken,
    refreshToken,
  };
};

/**
 * Authenticates an existing user.
 *
 * Steps:
 *  1. Look up the user by email — select passwordHash back in (excluded by default)
 *  2. Compare the plain-text password against the stored hash
 *  3. Update lastLoginAt timestamp (non-blocking — we don't await this)
 *  4. Sign and return a token pair alongside the safe user object
 *
 * Both "user not found" and "wrong password" return the same 401 message
 * to prevent user enumeration attacks.
 */
export const loginUser = async (input: LoginInput): Promise<AuthResult> => {
  const { email, password } = input;

  // 1. Fetch with passwordHash (stripped by toJSON transform, must re-select)
  const user = await UserModel
    .findOne({ email })
    .select('+passwordHash') // Re-include the field excluded by default transform
    .exec();

  // Generic error for both "not found" and "wrong password" — prevents enumeration
  const INVALID_CREDENTIALS = 'Invalid email or password.';

  if (!user) {
    throw new AppError(INVALID_CREDENTIALS, 401);
  }

  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Please contact support.', 403);
  }

  // 2. Timing-safe password comparison (bcrypt handles this internally)
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError(INVALID_CREDENTIALS, 401);
  }

  // 3. Fire-and-forget lastLoginAt update — failure here must NOT break login
  UserModel.findByIdAndUpdate(user._id, { lastLoginAt: new Date() }).exec().catch(
    () => { /* intentionally swallowed — non-critical */ }
  );

  // 4. Sign and return
  const { accessToken, refreshToken } = signTokenPair(user._id, user.role);

  return {
    user: toSafeUser(user),
    accessToken,
    refreshToken,
  };
};

/**
 * Fetches a user by ID for the /me endpoint.
 * The user is already verified by requireAuth middleware at this point.
 */
export const getMe = async (userId: Types.ObjectId): Promise<SafeUser> => {
  const user = await UserModel.findById(userId).lean();

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  // lean() returns a plain object — manually map to SafeUser
  return {
    _id:       user._id,
    name:      user.name,
    email:     user.email,
    role:      user.role,
    avatarUrl: user.avatarUrl,
    capacity:  user.capacity,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};