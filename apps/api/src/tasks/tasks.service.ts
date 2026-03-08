import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { CreateTaskDto } from './dto/create-task.dto';
import type { UpdateTaskDto } from './dto/update-task.dto';
import type { Task, DailyReport, DailyReportWithTasks } from '@daily-report/shared';

@Injectable()
export class TasksService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getOrCreateReport(
    userId: string,
    teamId: string,
    date: string,
  ): Promise<DailyReport> {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('daily_reports')
      .upsert(
        {
          user_id: userId,
          team_id: teamId,
          report_date: date,
          status: 'draft',
        },
        { onConflict: 'user_id,team_id,report_date' },
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return this.mapReport(data);
  }

  async assertReportEditable(reportId: string): Promise<void> {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('daily_reports')
      .select('status')
      .eq('id', reportId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Report not found');
    }

    if ((data as { status: string }).status === 'submitted') {
      throw new ForbiddenException('Cannot modify a submitted report');
    }
  }

  async assertReportOwner(reportId: string, userId: string): Promise<{ status: string }> {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('daily_reports')
      .select('user_id, status')
      .eq('id', reportId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Report not found');
    }

    const row = data as { user_id: string; status: string };

    if (row.user_id !== userId) {
      throw new ForbiddenException('Not the owner of this report');
    }

    return { status: row.status };
  }

  async createTask(userId: string, dto: CreateTaskDto): Promise<Task> {
    const report = await this.getOrCreateReport(userId, dto.teamId, dto.reportDate);

    if (report.status === 'submitted') {
      throw new ForbiddenException('Cannot modify a submitted report');
    }

    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('tasks')
      .insert({
        report_id: report.id,
        title: dto.title,
        estimated_hours: dto.estimatedHours,
        source_link: dto.sourceLink ?? null,
        notes: dto.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return this.mapTask(data);
  }

  async updateTask(userId: string, taskId: string, dto: UpdateTaskDto): Promise<Task> {
    const client = this.supabaseService.getClient();

    // Fetch task to get report_id
    const { data: task, error: taskError } = await client
      .from('tasks')
      .select('report_id')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      throw new NotFoundException('Task not found');
    }

    const reportId = (task as { report_id: string }).report_id;

    // Check ownership and editability in one call
    const { status } = await this.assertReportOwner(reportId, userId);
    if (status === 'submitted') {
      throw new ForbiddenException('Cannot modify a submitted report');
    }

    // Build update payload with only provided fields
    const updatePayload: Record<string, unknown> = {};
    if (dto.title !== undefined) updatePayload.title = dto.title;
    if (dto.estimatedHours !== undefined) updatePayload.estimated_hours = dto.estimatedHours;
    if (dto.sourceLink !== undefined) updatePayload.source_link = dto.sourceLink || null;
    if (dto.notes !== undefined) updatePayload.notes = dto.notes;

    const { data: updated, error: updateError } = await client
      .from('tasks')
      .update(updatePayload)
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Database error: ${updateError.message}`);
    }

    return this.mapTask(updated);
  }

  async deleteTask(userId: string, taskId: string): Promise<void> {
    const client = this.supabaseService.getClient();

    // Fetch task to get report_id
    const { data: task, error: taskError } = await client
      .from('tasks')
      .select('report_id')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      throw new NotFoundException('Task not found');
    }

    const reportId = (task as { report_id: string }).report_id;

    // Check ownership and editability
    const { status } = await this.assertReportOwner(reportId, userId);
    if (status === 'submitted') {
      throw new ForbiddenException('Cannot modify a submitted report');
    }

    const { error: deleteError } = await client
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (deleteError) {
      throw new Error(`Database error: ${deleteError.message}`);
    }
  }

  async getDailyReport(
    userId: string,
    teamId: string,
    date: string,
  ): Promise<DailyReportWithTasks | null> {
    const client = this.supabaseService.getClient();

    const { data: report, error: reportError } = await client
      .from('daily_reports')
      .select('*')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .eq('report_date', date)
      .maybeSingle();

    if (reportError) {
      throw new Error(`Database error: ${reportError.message}`);
    }

    if (!report) {
      return null;
    }

    const { data: tasks, error: tasksError } = await client
      .from('tasks')
      .select('*')
      .eq('report_id', (report as { id: string }).id)
      .order('sort_order')
      .order('created_at');

    if (tasksError) {
      throw new Error(`Database error: ${tasksError.message}`);
    }

    const mappedTasks = (tasks ?? []).map((t) => this.mapTask(t));
    const totalHours = mappedTasks.reduce((sum, t) => sum + t.estimatedHours, 0);

    return {
      report: this.mapReport(report),
      tasks: mappedTasks,
      totalHours,
    };
  }

  async submitReport(userId: string, reportId: string, stressLevel?: string): Promise<DailyReport> {
    // Check ownership
    const { status } = await this.assertReportOwner(reportId, userId);

    if (status === 'submitted') {
      throw new ForbiddenException('Report is already submitted');
    }

    const client = this.supabaseService.getClient();

    // Count tasks
    const { data: tasks, error: tasksError } = await client
      .from('tasks')
      .select('id')
      .eq('report_id', reportId);

    if (tasksError) {
      throw new Error(`Database error: ${tasksError.message}`);
    }

    if (!tasks || tasks.length === 0) {
      throw new BadRequestException('Cannot submit empty report');
    }

    const { data: updated, error: updateError } = await client
      .from('daily_reports')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        stress_level: stressLevel ?? null,
      })
      .eq('id', reportId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Database error: ${updateError.message}`);
    }

    return this.mapReport(updated);
  }

  private mapReport(row: Record<string, unknown>): DailyReport {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      teamId: row.team_id as string,
      reportDate: row.report_date as string,
      status: row.status as 'draft' | 'submitted',
      submittedAt: (row.submitted_at as string) ?? null,
      stressLevel: (row.stress_level as string as DailyReport['stressLevel']) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private mapTask(row: Record<string, unknown>): Task {
    return {
      id: row.id as string,
      reportId: row.report_id as string,
      title: row.title as string,
      estimatedHours: row.estimated_hours as number,
      sourceLink: (row.source_link as string) ?? null,
      notes: (row.notes as string) ?? null,
      sortOrder: (row.sort_order as number) ?? 0,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
