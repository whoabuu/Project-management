import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import {
  getMeHandler,
  updateMeHandler,
  searchUsersHandler,
} from './user.controller';

// ── Zod Schemas ───────────────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim()
    .optional(),

  avatarUrl: z
    .string()
    .url('avatarUrl must be a valid URL')
    .optional()
    .nullable(),

  capacity: z
    .object({
      weeklyHoursAvailable: z
        .number()
        .min(0, 'Cannot be negative')
        .max(80, 'Cannot exceed 80 hours per week')
        .optional(),

      skills: z
        .array(
          z.string().trim().min(1).max(50)
        )
        .max(30, 'Cannot list more than 30 skills')
        .optional(),

      timezone: z
        .string()
        .min(1, 'Timezone is required')
        .max(60)
        .optional(),

      isAvailable: z
        .boolean()
        .optional(),
    })
    .optional(),
})
.refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided to update.' }
);

export const SearchUsersSchema = z.object({
  q: z
    .string()
    .min(1, 'Search query must be at least 1 character')
    .max(100, 'Search query cannot exceed 100 characters')
    .trim()
    .optional(),

  skill: z
    .string()
    .trim()
    .optional(),

  role: z
    .enum(['admin', 'project_manager', 'developer', 'viewer'])
    .optional(),

  isAvailable: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),

  limit: z
    .string()
    .default('20')
    .transform((v) => {
      const n = parseInt(v, 10);
      if (isNaN(n) || n < 1 || n > 50) return 20;
      return n;
    }),

  page: z
    .string()
    .default('1')
    .transform((v) => {
      const n = parseInt(v, 10);
      if (isNaN(n) || n < 1) return 1;
      return n;
    }),
});

// ── Inferred Types ────────────────────────────────────────────────────────────

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type SearchUsersInput   = z.infer<typeof SearchUsersSchema>;

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

router.use(requireAuth);

/**
 * GET   /api/v1/users/me   — Get logged-in user's full profile
 * PATCH /api/v1/users/me   — Update logged-in user's profile
 */
router
  .route('/me')
  .get(getMeHandler)
  .patch(validate('body', UpdateProfileSchema), updateMeHandler);

/**
 * GET /api/v1/users        — Search users by name, email, skill, or role
 * Used by the frontend to find teammates to invite to projects.
 */
router
  .route('/')
  .get(validate('query', SearchUsersSchema as any), searchUsersHandler);

export { router as userRouter };