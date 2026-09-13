import type { NextFunction, Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth.js';

const handleBetterAuthRequest = toNodeHandler(auth);

/**
 * Monte les routes Better Auth (sign-in, sign-up, sign-out, ...) sous /api/auth/*, sauf
 * /api/auth/me : cette route custom (AuthController) est geree par NestJS, dont les routes
 * ne sont liees a l'adaptateur HTTP qu'a l'appel de app.listen() — donc apres ce middleware
 * dans la pile Express. Sans ce garde-fou, le handler Better Auth interceptait /api/auth/me
 * en premier et repondait 404 lui-meme (il ne reconnait pas cette route custom).
 */
export function betterAuthHandler(req: Request, res: Response, next: NextFunction) {
  const path = req.originalUrl.split('?')[0];
  if (path === '/api/auth/me') {
    next();
    return;
  }
  void handleBetterAuthRequest(req, res);
}
