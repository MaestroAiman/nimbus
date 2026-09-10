import type { AuthSession } from './session.types.js';

declare global {
  namespace Express {
    interface Request {
      authSession: AuthSession;
    }
  }
}

export {};
