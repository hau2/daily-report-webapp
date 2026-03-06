import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import type { AccessTokenUser } from '../auth/strategies/access-token.strategy';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller()
@UseGuards(AccessTokenGuard)
@UsePipes(new ValidationPipe({ whitelist: true }))
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('tasks')
  @HttpCode(HttpStatus.CREATED)
  async createTask(@Req() req: Request, @Body() dto: CreateTaskDto) {
    const user = req.user as AccessTokenUser;
    return this.tasksService.createTask(user.userId, dto);
  }

  @Patch('tasks/:id')
  async updateTask(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const user = req.user as AccessTokenUser;
    return this.tasksService.updateTask(user.userId, id, dto);
  }

  @Delete('tasks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTask(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as AccessTokenUser;
    await this.tasksService.deleteTask(user.userId, id);
  }

  @Get('reports/daily')
  async getDailyReport(
    @Req() req: Request,
    @Query('date') date: string,
    @Query('teamId') teamId: string,
  ) {
    if (!date || !DATE_REGEX.test(date)) {
      throw new BadRequestException('Query parameter "date" must be in YYYY-MM-DD format');
    }
    if (!teamId || !UUID_REGEX.test(teamId)) {
      throw new BadRequestException('Query parameter "teamId" must be a valid UUID');
    }

    const user = req.user as AccessTokenUser;
    return this.tasksService.getDailyReport(user.userId, teamId, date);
  }

  @Post('reports/:id/submit')
  async submitReport(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as AccessTokenUser;
    return this.tasksService.submitReport(user.userId, id);
  }
}
