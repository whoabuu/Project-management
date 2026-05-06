import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../shared/utils/apiResponse';

type RequestSection = 'body' | 'params' | 'query';

/**
 * Factory that returns an Express middleware validating a specific
 * section of the request against a Zod schema.
 *
 * Usage:
 *   router.post('/login', validate('body', LoginSchema), asyncHandler(controller));
 *
 * On success:  the parsed (and type-coerced) data replaces req[target].
 * On failure:  immediately returns a structured 400 with field-level errors.
 */
export const validate = <T>(
  target: RequestSection,
  schema: ZodSchema<T>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // `parse` throws ZodError on failure; `safeParse` returns a result object
      const parsed = schema.parse(req[target]);
      // Replace the raw input with the validated + coerced output
      // This ensures downstream controllers receive correct types
      (req as unknown as Record<string, unknown>)[target] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        sendError(res, 'Validation failed', {
          statusCode: 400,
          details: err.flatten().fieldErrors,
        });
        return;
      }
      next(err);
    }
  };
};