import { Request } from 'express';
import { IUser } from '../../models/User.model';

/**
 * Augments the Express Request type to include the authenticated user.
 * Set by auth.middleware.ts after JWT verification.
 */
export interface AuthenticatedRequest extends Request {
  user: Pick<IUser, '_id' | 'name' | 'email' | 'role'>;
}

/**
 * Generic paginated query parameters — validated by Zod in middleware.
 */
export interface PaginationQuery {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Standard paginated response meta block attached to list endpoints.
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}