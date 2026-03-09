import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '@daily-report/shared';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { SkipEmailVerification } from '../auth/guards/email-verified.guard';
import type { AccessTokenUser } from '../auth/strategies/access-token.strategy';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AccessTokenGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @SkipEmailVerification()
  async getMe(@Req() req: Request): Promise<User> {
    const user = req.user as AccessTokenUser;
    return this.usersService.getProfile(user.userId);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  async updateMe(
    @Req() req: Request,
    @Body() dto: UpdateProfileDto,
  ): Promise<User> {
    const user = req.user as AccessTokenUser;
    return this.usersService.updateProfile(user.userId, dto);
  }
}
