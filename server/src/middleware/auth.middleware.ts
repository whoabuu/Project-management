//import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './error.middleware';
import { asyncHandler } from '../shared/utils/asyncHandler';
import { AuthenticatedRequest } from '../shared/types/api.types';
import { UserModel } from '../models/User.model';
import { Types } from 'mongoose';

interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export const requireAuth = asyncHandler<AuthenticatedRequest>(
  async (req, _res, next) => {          // ← 'req' is now AuthenticatedRequest automatically
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Authorization header missing or malformed.', 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AppError('No token provided.', 401);
    }

    let decoded: JWTPayload;

    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new AppError('Your session has expired. Please log in again.', 401);
      }
      throw new AppError('Invalid token. Authentication failed.', 401);
    }

    const user = await UserModel.findById(new Types.ObjectId(decoded.sub))
      .select('_id name email role isActive')
      .lean();

    if (!user || !user.isActive) {
      throw new AppError('User account not found or has been deactivated.', 401);
    }

    req.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  }
);

export const requireRole = (
  ...allowedRoles: Array<'admin' | 'project_manager' | 'developer' | 'viewer'>
) => {
  return asyncHandler<AuthenticatedRequest>(
    async (req, _res, next) => {
      if (!req.user) {
        throw new AppError('Authentication required.', 401);
      }

      const userRole = req.user.role as typeof allowedRoles[number];

      if (!allowedRoles.includes(userRole)) {
        throw new AppError(
          `Access denied. Required role(s): ${allowedRoles.join(', ')}.`,
          403
        );
      }

      next();
    }
  );
};