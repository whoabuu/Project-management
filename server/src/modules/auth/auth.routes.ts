import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import { registerHandler, loginHandler, getMeHandler } from './auth.controller';

// ── Zod Request Schemas ───────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),

  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password cannot exceed 72 characters') // bcrypt hard limit
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  role: z
    .enum(['admin', 'project_manager', 'developer', 'viewer'])
    .default('developer'),
});

export const LoginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),

  password: z
    .string()
    .min(1, 'Password is required'),
});

// ── Inferred Types (used by service & controller) ─────────────────────────────

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput    = z.infer<typeof LoginSchema>;

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

/**
 * POST /api/v1/auth/register
 * Public — creates a new user account and returns tokens.
 */
router.post(
  '/register',
  validate('body', RegisterSchema),
  registerHandler
);

/**
 * POST /api/v1/auth/login
 * Public — authenticates credentials and returns tokens.
 */
router.post(
  '/login',
  validate('body', LoginSchema),
  loginHandler
);

/**
 * GET /api/v1/auth/me
 * Protected — returns the currently authenticated user's profile.
 */
router.get(
  '/me',
  requireAuth,
  getMeHandler
);

export { router as authRouter };