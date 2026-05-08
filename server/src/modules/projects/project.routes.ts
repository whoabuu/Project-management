import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import {
  createProjectHandler,
  getMyProjectsHandler,
  getProjectByIdHandler,
  updateProjectHandler,
  deleteProjectHandler,
  addMemberHandler,
  removeMemberHandler,
} from './project.controller';

// ── Zod Schemas ───────────────────────────────────────────────────────────────

export const CreateProjectSchema = z.object({
  name: z
    .string()
    .min(2, 'Project name must be at least 2 characters')
    .max(120, 'Project name cannot exceed 120 characters')
    .trim(),

  description: z
    .string()
    .max(1000, 'Description cannot exceed 1000 characters')
    .trim()
    .optional(),

  status: z
    .enum(['active', 'on_hold', 'completed', 'archived'])
    .default('active'),

  techStack: z
    .array(z.string().trim().min(1))
    .max(20, 'Cannot list more than 20 technologies')
    .default([]),

  domainDescription: z
    .string()
    .max(2000, 'Domain description cannot exceed 2000 characters')
    .trim()
    .optional(),
});

export const UpdateProjectSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(120)
    .trim()
    .optional(),

  description: z
    .string()
    .max(1000)
    .trim()
    .optional(),

  status: z
    .enum(['active', 'on_hold', 'completed', 'archived'])
    .optional(),

  techStack: z
    .array(z.string().trim().min(1))
    .max(20)
    .optional(),

  domainDescription: z
    .string()
    .max(2000)
    .trim()
    .optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided to update.' }
);

export const AddMemberSchema = z.object({
  userId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid user ID format'),

  role: z
    .enum(['project_manager', 'developer', 'viewer'])
    .default('developer'),
});

export const ProjectIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid project ID format'),
});

export const MemberParamSchema = z.object({
  id:     z.string().regex(/^[a-f\d]{24}$/i, 'Invalid project ID'),
  userId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid user ID'),
});

// ── Inferred Types ────────────────────────────────────────────────────────────

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type AddMemberInput     = z.infer<typeof AddMemberSchema>;

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

// All project routes require authentication
router.use(requireAuth);

/**
 * POST   /api/v1/projects          — Create a new project
 * GET    /api/v1/projects          — Get all projects for current user
 */
router
  .route('/')
  .post(validate('body', CreateProjectSchema), createProjectHandler)
  .get(getMyProjectsHandler);

/**
 * GET    /api/v1/projects/:id      — Get a single project by ID
 * PATCH  /api/v1/projects/:id      — Update a project (owner/PM only)
 * DELETE /api/v1/projects/:id      — Delete a project (owner only)
 */
router
  .route('/:id')
  .get(validate('params', ProjectIdParamSchema), getProjectByIdHandler)
  .patch(
    validate('params', ProjectIdParamSchema),
    validate('body', UpdateProjectSchema),
    updateProjectHandler
  )
  .delete(validate('params', ProjectIdParamSchema), deleteProjectHandler);

/**
 * POST   /api/v1/projects/:id/members          — Add a member
 * DELETE /api/v1/projects/:id/members/:userId  — Remove a member
 */
router.post(
  '/:id/members',
  validate('params', ProjectIdParamSchema),
  validate('body', AddMemberSchema),
  addMemberHandler
);

router.delete(
  '/:id/members/:userId',
  validate('params', MemberParamSchema),
  removeMemberHandler
);

export { router as projectRouter };