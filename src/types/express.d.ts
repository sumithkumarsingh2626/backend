/**
 * Extended Express typings (JWT-backed `req.user`).
 */

import type { UserRoleValue } from '../constants';

declare global {
  namespace Express {
    interface Request {
      /** Set by JWT auth middleware when a Bearer/cookie token is valid. */
      user?: {
        id: string;
        role: UserRoleValue | string;
      };
    }
  }
}

export {};
