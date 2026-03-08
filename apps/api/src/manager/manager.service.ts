import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  TeamMemberReport,
  PendingMember,
  TeamReportsResponse,
  DailyReport,
  Task,
} from '@daily-report/shared';

@Injectable()
export class ManagerService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getTeamReports(
    teamId: string,
    date: string,
  ): Promise<TeamReportsResponse> {
    const client = this.supabaseService.getClient();

    // 1. Get active team members (left_at is null)
    const { data: activeMembers, error: membersError } = await client
      .from('team_members')
      .select('user_id, role')
      .eq('team_id', teamId)
      .is('left_at', null);

    if (membersError) {
      throw new Error(`Database error: ${membersError.message}`);
    }

    const activeUserIds = (activeMembers ?? []).map(
      (m: { user_id: string }) => m.user_id,
    );

    // 3. Get daily reports for the date (need this before departed member check)
    const { data: reports, error: reportsError } = await client
      .from('daily_reports')
      .select('*')
      .eq('team_id', teamId)
      .eq('report_date', date);

    if (reportsError) {
      throw new Error(`Database error: ${reportsError.message}`);
    }

    // Find departed members who have reports for this date
    const departedUserIds: string[] = [];
    for (const report of reports ?? []) {
      const reportUserId = (report as Record<string, unknown>).user_id as string;
      if (!activeUserIds.includes(reportUserId) && !departedUserIds.includes(reportUserId)) {
        departedUserIds.push(reportUserId);
      }
    }

    const allUserIds = [...activeUserIds, ...departedUserIds];

    if (allUserIds.length === 0) {
      return { date, teamId, members: [] };
    }

    // 2. Get user details
    const { data: users, error: usersError } = await client
      .from('users')
      .select('id, email, display_name')
      .in('id', allUserIds);

    if (usersError) {
      throw new Error(`Database error: ${usersError.message}`);
    }

    const userMap = new Map(
      (users ?? []).map((u: { id: string; email: string; display_name: string }) => [
        u.id,
        u,
      ]),
    );

    const reportsByUser = new Map(
      (reports ?? []).map((r: Record<string, unknown>) => [
        r.user_id as string,
        r,
      ]),
    );

    // 4. Get tasks for all reports
    const reportIds = (reports ?? []).map(
      (r: { id: string }) => r.id,
    );

    let tasksByReport = new Map<string, Record<string, unknown>[]>();

    if (reportIds.length > 0) {
      const { data: tasks, error: tasksError } = await client
        .from('tasks')
        .select('*')
        .in('report_id', reportIds)
        .order('sort_order')
        .order('created_at');

      if (tasksError) {
        throw new Error(`Database error: ${tasksError.message}`);
      }

      for (const task of tasks ?? []) {
        const rid = (task as { report_id: string }).report_id;
        if (!tasksByReport.has(rid)) {
          tasksByReport.set(rid, []);
        }
        tasksByReport.get(rid)!.push(task as Record<string, unknown>);
      }
    }

    // 5. Assemble per-member view (active + departed with reports)
    const departedSet = new Set(departedUserIds);
    const memberReports: TeamMemberReport[] = allUserIds.map((userId: string) => {
      const user = userMap.get(userId);
      const reportRow = reportsByUser.get(userId);
      const report = reportRow ? this.mapReport(reportRow as Record<string, unknown>) : null;
      const rawTasks = report
        ? (tasksByReport.get(report.id) ?? [])
        : [];
      const tasks = rawTasks.map((t) => this.mapTask(t));
      const totalHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);

      let status: 'draft' | 'submitted' | 'none' = 'none';
      if (report) {
        status = report.status;
      }

      const memberReport: TeamMemberReport = {
        userId,
        email: user?.email ?? '',
        displayName: user?.display_name ?? '',
        status,
        report,
        tasks,
        totalHours,
        stressLevel: report?.stressLevel ?? null,
      };

      if (departedSet.has(userId)) {
        memberReport.departed = true;
      }

      return memberReport;
    });

    return { date, teamId, members: memberReports };
  }

  async getPendingSubmissions(
    teamId: string,
    date: string,
  ): Promise<PendingMember[]> {
    const client = this.supabaseService.getClient();

    // 1. Get active team members (left_at is null)
    const { data: members, error: membersError } = await client
      .from('team_members')
      .select('user_id, role')
      .eq('team_id', teamId)
      .is('left_at', null);

    if (membersError) {
      throw new Error(`Database error: ${membersError.message}`);
    }

    const userIds = (members ?? []).map(
      (m: { user_id: string }) => m.user_id,
    );

    if (userIds.length === 0) {
      return [];
    }

    // 2. Get user details
    const { data: users, error: usersError } = await client
      .from('users')
      .select('id, email, display_name')
      .in('id', userIds);

    if (usersError) {
      throw new Error(`Database error: ${usersError.message}`);
    }

    const userMap = new Map(
      (users ?? []).map((u: { id: string; email: string; display_name: string }) => [
        u.id,
        u,
      ]),
    );

    // 3. Get daily reports for the date
    const { data: reports, error: reportsError } = await client
      .from('daily_reports')
      .select('*')
      .eq('team_id', teamId)
      .eq('report_date', date);

    if (reportsError) {
      throw new Error(`Database error: ${reportsError.message}`);
    }

    const reportsByUser = new Map(
      (reports ?? []).map((r: Record<string, unknown>) => [
        r.user_id as string,
        r,
      ]),
    );

    // 4. Find members without submitted reports
    const pending: PendingMember[] = [];

    for (const userId of userIds) {
      const reportRow = reportsByUser.get(userId);
      const user = userMap.get(userId);

      if (!reportRow || (reportRow as Record<string, unknown>).status !== 'submitted') {
        const reportStatus: 'draft' | 'none' = reportRow ? 'draft' : 'none';
        pending.push({
          userId,
          email: user?.email ?? '',
          displayName: user?.display_name ?? '',
          reportStatus,
        });
      }
    }

    return pending;
  }

  async generateCsv(teamId: string, date: string): Promise<string> {
    const { members } = await this.getTeamReports(teamId, date);

    const header =
      'Member Name,Email,Date,Report Status,Task,Hours,Source Link,Notes';
    const rows: string[] = [header];

    for (const member of members) {
      if (member.tasks.length === 0) {
        rows.push(
          [
            this.escapeCsvField(member.displayName),
            this.escapeCsvField(member.email),
            date,
            member.status,
            '',
            '',
            '',
            '',
          ].join(','),
        );
      } else {
        for (const task of member.tasks) {
          rows.push(
            [
              this.escapeCsvField(member.displayName),
              this.escapeCsvField(member.email),
              date,
              member.status,
              this.escapeCsvField(task.title),
              String(task.estimatedHours),
              this.escapeCsvField(task.sourceLink ?? ''),
              this.escapeCsvField(task.notes ?? ''),
            ].join(','),
          );
        }
      }
    }

    return rows.join('\n');
  }

  private escapeCsvField(field: string): string {
    if (
      field.includes(',') ||
      field.includes('"') ||
      field.includes('\n')
    ) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
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
