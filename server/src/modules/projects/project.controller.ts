import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/types/api.types';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess } from '../../shared/utils/apiResponse';
import {
  createProject,
  getProjectsForUser,
  getProjectById,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
} from './project.service';
import {
  CreateProjectInput,
  UpdateProjectInput,
  AddMemberInput,
} from './project.routes';

// ── Create Project ────────────────────────────────────────────────────────────

export const createProjectHandler = asyncHandler<AuthenticatedRequest>(
  async (req: AuthenticatedRequest, res: Response) => {
    const input  = req.body as CreateProjectInput;
    const userId = req.user._id;

    const project = await createProject(input, userId);

    sendSuccess(res, { project }, {
      message:    'Project created successfully.',
      statusCode: 201,
    });
  }
);

// ── Get All Projects (for current user) ───────────────────────────────────────

export const getMyProjectsHandler = asyncHandler<AuthenticatedRequest>(
  async (req: AuthenticatedRequest, res: Response) => {
    const projects = await getProjectsForUser(req.user._id);

    sendSuccess(res, { projects, count: projects.length });
  }
);

// ── Get Single Project ────────────────────────────────────────────────────────

export const getProjectByIdHandler = asyncHandler<AuthenticatedRequest>(
  async (req: AuthenticatedRequest, res: Response) => {
    const project = await getProjectById(req.params['id'] as string, req.user._id);

    sendSuccess(res, { project });
  }
);

// ── Update Project ────────────────────────────────────────────────────────────

export const updateProjectHandler = asyncHandler<AuthenticatedRequest>(
  async (req: AuthenticatedRequest, res: Response) => {
    const input   = req.body as UpdateProjectInput;
    const project = await updateProject(
      req.params['id'] as string,
      input,
      req.user._id
    );

    sendSuccess(res, { project }, { message: 'Project updated successfully.' });
  }
);

// ── Delete Project ────────────────────────────────────────────────────────────

export const deleteProjectHandler = asyncHandler<AuthenticatedRequest>(
  async (req: AuthenticatedRequest, res: Response) => {
    await deleteProject(req.params['id'] as string, req.user._id);

    sendSuccess(res, null, {
      message:    'Project deleted successfully.',
      statusCode: 200,
    });
  }
);

// ── Add Member ────────────────────────────────────────────────────────────────

export const addMemberHandler = asyncHandler<AuthenticatedRequest>(
  async (req: AuthenticatedRequest, res: Response) => {
    const input   = req.body as AddMemberInput;
    const project = await addMember(
      req.params['id'] as string,
      input,
      req.user._id
    );

    sendSuccess(res, { project }, {
      message:    'Member added successfully.',
      statusCode: 201,
    });
  }
);

// ── Remove Member ─────────────────────────────────────────────────────────────

export const removeMemberHandler = asyncHandler<AuthenticatedRequest>(
  async (req: AuthenticatedRequest, res: Response) => {
    const project = await removeMember(
      req.params['id'] as string,
      req.params['userId'] as string,
      req.user._id
    );

    sendSuccess(res, { project }, { message: 'Member removed successfully.' });
  }
);