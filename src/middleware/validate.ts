import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodTypeAny } from 'zod';

type RequestSource = 'body' | 'query' | 'params';

/**
 * Zod validation middleware generator.
 * Validates the specified part of the Express request.
 * Returns 400 Bad Request with details if validation fails.
 */
export function validate(schema: ZodTypeAny, source: RequestSource = 'body') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync(req[source]);
      req[source] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: issues,
        });
        return;
      }
      next(error);
    }
  };
}

