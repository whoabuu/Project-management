import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async route handler and forwards any thrown errors to
 * Express's next() function — eliminating repetitive try/catch blocks
 * in every controller.
 *
 * Usage:
 *   router.get('/resource', asyncHandler(async (req, res) => {
 *     const data = await someService.get();
 *     sendSuccess(res, data);
 *   }));
 */
export const asyncHandler = <TReq extends Request = Request>(
  fn: (req: TReq, res: Response, next: NextFunction) => Promise<void | Response>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req as TReq, res, next)).catch(next);
  };
};