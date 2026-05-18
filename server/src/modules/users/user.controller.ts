import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/types/api.types';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { getMe, updateMe, searchUsers } from './user.service';
import { UpdateProfileInput, SearchUsersInput } from './user.routes';

// ── Get My Profile ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/users/me
 *
 * Returns the full private profile of the authenticated user.
 * This is richer than the /auth/me endpoint — includes capacity
 * details and projectIds needed by the dashboard.
 */
export const getMeHandler = asyncHandler<AuthenticatedRequest>(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = await getMe(req.user._id);

    sendSuccess(res, { user });
  }
);

// ── Update My Profile ─────────────────────────────────────────────────────────

/**
 * PATCH /api/v1/users/me
 *
 * Partial update — only the fields provided in the body are changed.
 * Capacity sub-fields are merged, not replaced.
 */
export const updateMeHandler = asyncHandler<AuthenticatedRequest>(
  async (req: AuthenticatedRequest, res: Response) => {
    const input = req.body as UpdateProfileInput;

    const user = await updateMe(req.user._id, input);

    sendSuccess(res, { user }, {
      message: 'Profile updated successfully.',
    });
  }
);

// ── Search Users ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/users?q=alice&skill=React&role=developer&isAvailable=true
 *
 * Searches users for team discovery and project invitations.
 * All query params are optional — omitting all returns a paginated
 * list of all users (excluding the requester).
 *
 * Returns only public-safe fields — no passwords, no embeddings.
 */
export const searchUsersHandler = asyncHandler<AuthenticatedRequest>(
  async (req: AuthenticatedRequest, res: Response) => {
    const query = req.query as unknown as SearchUsersInput;

    const { users, pagination } = await searchUsers(query, req.user._id);

    sendSuccess(res, { users }, {
      meta: {
        pagination,
        count: users.length,
      },
    });
  }
);