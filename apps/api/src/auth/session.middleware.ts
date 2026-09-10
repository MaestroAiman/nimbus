import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth.js';

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  async use(request: Request, _response: Response, next: NextFunction): Promise<void> {
    request.authSession = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    next();
  }
}
