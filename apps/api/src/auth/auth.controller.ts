import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from './auth.guard.js';

@Controller('auth')
export class AuthController {
  @UseGuards(AuthGuard)
  @Get('me')
  getMe(@Req() request: Request) {
    return request.authSession;
  }
}
