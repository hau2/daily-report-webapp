import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Req } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { TeamManagerGuard } from '../teams/guards/team-manager.guard';
import type { AccessTokenUser } from '../auth/strategies/access-token.strategy';
import { ManagerService } from './manager.service';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

@Controller('teams/:id')
@UseGuards(AccessTokenGuard, TeamManagerGuard)
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  @Get('reports')
  async getTeamReports(
    @Param('id') teamId: string,
    @Query('date') date: string,
  ) {
    if (!date || !DATE_REGEX.test(date)) {
      throw new BadRequestException(
        'Query parameter "date" must be in YYYY-MM-DD format',
      );
    }

    return this.managerService.getTeamReports(teamId, date);
  }

  @Get('reports/pending')
  async getPendingSubmissions(
    @Param('id') teamId: string,
    @Query('date') date: string,
  ) {
    if (!date || !DATE_REGEX.test(date)) {
      throw new BadRequestException(
        'Query parameter "date" must be in YYYY-MM-DD format',
      );
    }

    return this.managerService.getPendingSubmissions(teamId, date);
  }

  @Get('reports/export')
  async exportTeamReports(
    @Param('id') teamId: string,
    @Query('date') date: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    if (!date || !DATE_REGEX.test(date)) {
      throw new BadRequestException(
        'Query parameter "date" must be in YYYY-MM-DD format',
      );
    }

    try {
      const csv = await this.managerService.generateCsv(teamId, date);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="team-report-${date}.csv"`,
      );
      res.send(csv);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          statusCode: 500,
          message: 'Failed to generate CSV export',
        });
      }
    }
  }
}
