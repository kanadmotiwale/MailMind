import { Request, Response, NextFunction } from 'express'

export interface AppError extends Error {
  statusCode?: number
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.statusCode ?? 500
  const isProd = process.env.NODE_ENV === 'production'

  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(isProd ? {} : { details: err.stack }),
  })
}
