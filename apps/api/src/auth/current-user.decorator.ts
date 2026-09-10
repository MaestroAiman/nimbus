import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from './session.types.js';

/**
 * A utiliser uniquement sur des routes protegees par AuthGuard :
 * AuthGuard garantit que request.authSession est non nul avant que ce decorateur ne s'execute.
 */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser => {
  const request = context.switchToHttp().getRequest<Request>();
  return request.authSession!.user;
});
