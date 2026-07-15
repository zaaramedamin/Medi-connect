import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../services/logger';

// Adds req.id to the Express request.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Tags every request with an id and logs one structured line when it finishes:
 * method, path, status, latency, and the caller if authenticated. Deliberately
 * logs NO body or query string — request bodies on /api/records carry PHI, so
 * only metadata is recorded. The id is echoed back as X-Request-Id so a user
 * report ("something failed") can be tied to a log line.
 */
export function requestLog(req: Request, res: Response, next: NextFunction) {
  const id = (req.headers['x-request-id'] as string) || randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level]('request', {
      id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Math.round(ms),
      user: req.user?.id,
      role: req.user?.role,
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip,
    });
  });

  next();
}
