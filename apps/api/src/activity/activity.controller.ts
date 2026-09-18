import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/session.types.js';
import { ActivityService } from './activity.service.js';

@UseGuards(AuthGuard)
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return user.role === 'ADMIN' ? this.activityService.listAll() : this.activityService.listForUser(user.id);
  }
}
