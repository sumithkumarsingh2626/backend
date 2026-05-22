import type { NextFunction, Request, Response } from 'express';

function sanitizeValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item)) as T;
  }

  if (value && typeof value === 'object') {
    const nextObject: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      if (key.startsWith('$') || key.includes('.')) {
        continue;
      }

      nextObject[key] = sanitizeValue(nestedValue);
    }

    return nextObject as T;
  }

  return value;
}

export function sanitizeRequest(req: Request, _res: Response, next: NextFunction): void {
  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query);
  req.params = sanitizeValue(req.params);
  next();
}
