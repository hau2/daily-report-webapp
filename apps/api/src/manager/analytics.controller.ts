import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { TeamManagerGuard } from '../teams/guards/team-manager.guard';
import { AnalyticsService } from './analytics.service';
import type { AnalyticsRange } from '@daily-report/shared';

const VALID_RANGES = ['week', 'month', 'quarter'];

@Controller('teams/:id')
@UseGuards(AccessTokenGuard, TeamManagerGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('analytics/team')
  async getTeamAnalytics(
    @Param('id') teamId: string,
    @Query('range') range?: string,
  ) {
    const validRange = this.validateRange(range);
    return this.analyticsService.getTeamAnalytics(teamId, validRange);
  }

  @Get('analytics/member/:userId')
  async getMemberAnalytics(
    @Param('id') teamId: string,
    @Param('userId') userId: string,
    @Query('range') range?: string,
  ) {
    const validRange = this.validateRange(range);
    return this.analyticsService.getMemberAnalytics(teamId, userId, validRange);
  }

  private validateRange(range?: string): AnalyticsRange {
    const r = range || 'week';
    if (!VALID_RANGES.includes(r)) {
      throw new BadRequestException(
        `Query parameter "range" must be one of: ${VALID_RANGES.join(', ')}`,
      );
    }
    return r as AnalyticsRange;
  }
}
