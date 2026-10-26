import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
}

/**
 * Global centralized error-handling middleware.
 * Catches all unhandled errors, logs the full stack trace internally for debugging,
 * and responds with a sanitized, user-safe JSON error response.
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Log error with context internally
  console.error(`[SERVER ERROR] [${req.method}] ${req.originalUrl}:`, {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });

  // Client response: Always sanitize in production or for internal 500 errors
  res.status(statusCode).json({
    success: false,
    error: statusCode === 500
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Request failed',
    ...(isProduction ? {} : { debugMessage: err.message }),
  });
}

