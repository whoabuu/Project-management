import { Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { AuthenticatedRequest } from '../../shared/types/api.types';
import { registerUser, loginUser, getMe } from './auth.service';
import { RegisterInput, LoginInput } from './auth.routes';
import { Request } from 'express';

// ── Register ──────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 *
 * Body is pre-validated and type-coerced by the Zod validate middleware,
 * so we cast req.body directly to RegisterInput — it is guaranteed to conform.
 */
export const registerHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const input = req.body as RegisterInput;

    const result = await registerUser(input);

    sendSuccess(res, result, {
      message: 'Account created successfully.',
      statusCode: 201,
    });
  }
);

// ── Login ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/login
 */
export const loginHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const input = req.body as LoginInput;

    const result = await loginUser(input);

    sendSuccess(res, result, {
      message: 'Login successful.',
    });
  }
);

// ── Get Current User ──────────────────────────────────────────────────────────

/**
 * GET /api/v1/auth/me
 * requireAuth middleware has already verified the token and attached req.user.
 */
export const getMeHandler = asyncHandler<AuthenticatedRequest>(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = await getMe(req.user._id);

    sendSuccess(res, { user }, {
      message: 'User profile fetched successfully.',
    });
  }
);