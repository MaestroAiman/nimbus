import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/session.types.js';
import { TrashService } from './trash.service.js';

@UseGuards(AuthGuard)
@Controller('trash')
export class TrashController {
  constructor(private readonly trashService: TrashService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.trashService.listRoots(user.id);
  }
}
