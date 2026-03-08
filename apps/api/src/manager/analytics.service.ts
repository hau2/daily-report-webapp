import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  AnalyticsRange,
  TeamAnalyticsResponse,
  MemberAnalyticsResponse,
  StressLevel,
} from '@daily-report/shared';

interface DateRange {
  startDate: string;
  endDate: string;
  prevStartDate: string;
  prevEndDate: string;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  getDateRange(range: AnalyticsRange): DateRange {
    const days = range === 'week' ? 7 : range === 'month' ? 30 : 90;
    const now = new Date();
    const endDate = this.formatDate(now);

    const start = new Date(now);
    start.setDate(start.getDate() - days + 1);
    const startDate = this.formatDate(start);

    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevEndDate = this.formatDate(prevEnd);

    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - days + 1);
    const prevStartDate = this.formatDate(prevStart);

    return { startDate, endDate, prevStartDate, prevEndDate };
  }

  async getTeamAnalytics(
    teamId: string,
    range: AnalyticsRange,
  ): Promise<TeamAnalyticsResponse> {
    const client = this.supabaseService.getClient();
    const { startDate, endDate, prevStartDate, prevEndDate } =
      this.getDateRange(range);
    const days =
      range === 'week' ? 7 : range === 'month' ? 30 : 90;

    // 1. Get active team members
    const { data: members, error: membersError } = await client
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .is('left_at', null);

    if (membersError) throw new Error(`Database error: ${membersError.message}`);
    const memberIds = (members ?? []).map((m: { user_id: string }) => m.user_id);
    const memberCount = memberIds.length;

    // Get user display names
    let userMap = new Map<string, string>();
    if (memberIds.length > 0) {
      const { data: users, error: usersError } = await client
        .from('users')
        .select('id, display_name')
        .in('id', memberIds);
      if (usersError) throw new Error(`Database error: ${usersError.message}`);
      userMap = new Map(
        (users ?? []).map((u: { id: string; display_name: string }) => [
          u.id,
          u.display_name,
        ]),
      );
    }

    // 2. Get reports for current period
    const { data: currentReports, error: crError } = await client
      .from('daily_reports')
      .select('*')
      .eq('team_id', teamId)
      .gte('report_date', startDate)
      .lte('report_date', endDate);

    if (crError) throw new Error(`Database error: ${crError.message}`);
    const reports = (currentReports ?? []) as Record<string, unknown>[];

    // 3. Get reports for previous period (for trends)
    const { data: prevReports, error: prError } = await client
      .from('daily_reports')
      .select('*')
      .eq('team_id', teamId)
      .gte('report_date', prevStartDate)
      .lte('report_date', prevEndDate);

    if (prError) throw new Error(`Database error: ${prError.message}`);
    const prevReportsList = (prevReports ?? []) as Record<string, unknown>[];

    // 4. Get tasks for current reports
    const currentReportIds = reports.map((r) => r.id as string);
    let tasks: Record<string, unknown>[] = [];
    if (currentReportIds.length > 0) {
      const { data: taskData, error: tError } = await client
        .from('tasks')
        .select('*')
        .in('report_id', currentReportIds);
      if (tError) throw new Error(`Database error: ${tError.message}`);
      tasks = (taskData ?? []) as Record<string, unknown>[];
    }

    // 5. Get tasks for previous reports
    const prevReportIds = prevReportsList.map((r) => r.id as string);
    let prevTasks: Record<string, unknown>[] = [];
    if (prevReportIds.length > 0) {
      const { data: ptData, error: ptError } = await client
        .from('tasks')
        .select('*')
        .in('report_id', prevReportIds);
      if (ptError) throw new Error(`Database error: ${ptError.message}`);
      prevTasks = (ptData ?? []) as Record<string, unknown>[];
    }

    // --- Aggregations ---

    // Submitted reports in current period
    const submittedReports = reports.filter((r) => r.status === 'submitted');
    const prevSubmittedReports = prevReportsList.filter(
      (r) => r.status === 'submitted',
    );

    // Submission rate
    const totalPossible = memberCount * days;
    const submissionRate =
      totalPossible > 0
        ? (submittedReports.length / totalPossible) * 100
        : 0;
    const prevTotalPossible = memberCount * days;
    const prevSubmissionRate =
      prevTotalPossible > 0
        ? (prevSubmittedReports.length / prevTotalPossible) * 100
        : 0;

    // Avg hours per day
    const totalHours = tasks.reduce(
      (sum, t) => sum + ((t.estimated_hours as number) || 0),
      0,
    );
    const prevTotalHours = prevTasks.reduce(
      (sum, t) => sum + ((t.estimated_hours as number) || 0),
      0,
    );
    const avgHoursPerDay = days > 0 ? totalHours / days : 0;
    const prevAvgHoursPerDay = days > 0 ? prevTotalHours / days : 0;

    // Stress distribution from submitted reports
    const stressDistribution = { low: 0, medium: 0, high: 0 };
    for (const r of submittedReports) {
      const level = r.stress_level as string | null;
      if (level === 'low') stressDistribution.low++;
      else if (level === 'medium') stressDistribution.medium++;
      else if (level === 'high') stressDistribution.high++;
    }

    // Task counts
    const taskCount = tasks.length;
    const prevTaskCount = prevTasks.length;

    // Per-day submission rates
    const dateList = this.getDateList(startDate, endDate);
    const submissionRates = dateList.map((date) => {
      const daySubmitted = submittedReports.filter(
        (r) => r.report_date === date,
      ).length;
      return {
        date,
        rate: memberCount > 0 ? (daySubmitted / memberCount) * 100 : 0,
        submitted: daySubmitted,
        total: memberCount,
      };
    });

    // Heatmap: member x day -> hours
    const reportUserDateMap = new Map<string, string>();
    for (const r of reports) {
      reportUserDateMap.set(r.id as string, `${r.user_id}|${r.report_date}`);
    }
    const heatmapMap = new Map<string, number>();
    for (const t of tasks) {
      const key = reportUserDateMap.get(t.report_id as string);
      if (key) {
        heatmapMap.set(key, (heatmapMap.get(key) || 0) + ((t.estimated_hours as number) || 0));
      }
    }
    const heatmap = Array.from(heatmapMap.entries()).map(([key, hours]) => {
      const [userId, date] = key.split('|');
      return {
        userId,
        displayName: userMap.get(userId) ?? '',
        date,
        hours,
      };
    });

    // Stress trend: per-day distribution
    const stressTrend = dateList.map((date) => {
      const dayReports = submittedReports.filter(
        (r) => r.report_date === date,
      );
      const dist = { date, low: 0, medium: 0, high: 0 };
      for (const r of dayReports) {
        const level = r.stress_level as string | null;
        if (level === 'low') dist.low++;
        else if (level === 'medium') dist.medium++;
        else if (level === 'high') dist.high++;
      }
      return dist;
    });

    // Task volume by member
    const tasksByUser = new Map<string, number>();
    for (const t of tasks) {
      const report = reports.find((r) => r.id === t.report_id);
      if (report) {
        const uid = report.user_id as string;
        tasksByUser.set(uid, (tasksByUser.get(uid) || 0) + 1);
      }
    }
    const taskVolumeByMember = Array.from(tasksByUser.entries())
      .map(([userId, tc]) => ({
        userId,
        displayName: userMap.get(userId) ?? '',
        taskCount: tc,
      }))
      .sort((a, b) => b.taskCount - a.taskCount);

    return {
      range,
      startDate,
      endDate,
      summary: {
        submissionRate: Math.round(submissionRate * 100) / 100,
        submissionRateTrend:
          Math.round((submissionRate - prevSubmissionRate) * 100) / 100,
        avgHoursPerDay: Math.round(avgHoursPerDay * 100) / 100,
        avgHoursPerDayTrend:
          Math.round((avgHoursPerDay - prevAvgHoursPerDay) * 100) / 100,
        stressDistribution,
        taskCount,
        taskCountTrend: taskCount - prevTaskCount,
      },
      submissionRates,
      heatmap,
      stressTrend,
      taskVolumeByMember,
    };
  }

  async getMemberAnalytics(
    teamId: string,
    userId: string,
    range: AnalyticsRange,
  ): Promise<MemberAnalyticsResponse> {
    const client = this.supabaseService.getClient();
    const { startDate, endDate } = this.getDateRange(range);
    const days = range === 'week' ? 7 : range === 'month' ? 30 : 90;

    // 1. Get user display name
    const { data: user, error: userError } = await client
      .from('users')
      .select('id, display_name')
      .eq('id', userId)
      .single();

    if (userError) throw new Error(`Database error: ${userError.message}`);
    const displayName = (user as { display_name: string })?.display_name ?? '';

    // 2. Get member's reports in range
    const { data: memberReports, error: mrError } = await client
      .from('daily_reports')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .gte('report_date', startDate)
      .lte('report_date', endDate);

    if (mrError) throw new Error(`Database error: ${mrError.message}`);
    const reports = (memberReports ?? []) as Record<string, unknown>[];

    // 3. Get member's tasks
    const reportIds = reports.map((r) => r.id as string);
    let tasks: Record<string, unknown>[] = [];
    if (reportIds.length > 0) {
      const { data: taskData, error: tError } = await client
        .from('tasks')
        .select('*')
        .in('report_id', reportIds);
      if (tError) throw new Error(`Database error: ${tError.message}`);
      tasks = (taskData ?? []) as Record<string, unknown>[];
    }

    // 4. Get all team reports for averages
    const { data: allTeamReports, error: atrError } = await client
      .from('daily_reports')
      .select('*')
      .eq('team_id', teamId)
      .gte('report_date', startDate)
      .lte('report_date', endDate);

    if (atrError) throw new Error(`Database error: ${atrError.message}`);
    const teamReports = (allTeamReports ?? []) as Record<string, unknown>[];

    // 5. Get all team tasks for averages
    const teamReportIds = teamReports.map((r) => r.id as string);
    let allTeamTasks: Record<string, unknown>[] = [];
    if (teamReportIds.length > 0) {
      const { data: ttData, error: ttError } = await client
        .from('tasks')
        .select('*')
        .in('report_id', teamReportIds);
      if (ttError) throw new Error(`Database error: ${ttError.message}`);
      allTeamTasks = (ttData ?? []) as Record<string, unknown>[];
    }

    // 6. Get active member count
    const { data: activeMembers, error: amError } = await client
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .is('left_at', null);

    if (amError) throw new Error(`Database error: ${amError.message}`);
    const memberCount = (activeMembers ?? []).length;

    // --- Calculate submission streak ---
    // Get recent submitted reports to calculate streak (going back from today)
    const { data: streakReports, error: srError } = await client
      .from('daily_reports')
      .select('report_date')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('status', 'submitted')
      .order('report_date', { ascending: false })
      .limit(365);

    if (srError) throw new Error(`Database error: ${srError.message}`);

    const submittedDates = new Set(
      ((streakReports ?? []) as { report_date: string }[]).map(
        (r) => r.report_date,
      ),
    );
    let submissionStreak = 0;
    const checkDate = new Date();
    // Only count weekdays or all days? Plan says "consecutive days" so all days
    for (let i = 0; i < 365; i++) {
      const dateStr = this.formatDate(checkDate);
      if (submittedDates.has(dateStr)) {
        submissionStreak++;
      } else {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // --- Aggregations ---
    const dateList = this.getDateList(startDate, endDate);
    const submittedReports = reports.filter((r) => r.status === 'submitted');

    // Member hours
    const totalMemberHours = tasks.reduce(
      (sum, t) => sum + ((t.estimated_hours as number) || 0),
      0,
    );
    const avgHours = days > 0 ? totalMemberHours / days : 0;

    // Team avg hours
    const totalTeamHours = allTeamTasks.reduce(
      (sum, t) => sum + ((t.estimated_hours as number) || 0),
      0,
    );
    const teamAvgHours =
      memberCount > 0 && days > 0 ? totalTeamHours / (memberCount * days) : 0;

    // Stress - most common (mode)
    const stressCounts = { low: 0, medium: 0, high: 0 };
    for (const r of submittedReports) {
      const level = r.stress_level as string | null;
      if (level === 'low') stressCounts.low++;
      else if (level === 'medium') stressCounts.medium++;
      else if (level === 'high') stressCounts.high++;
    }
    const totalStress = stressCounts.low + stressCounts.medium + stressCounts.high;
    let mostCommonStress: StressLevel | null = null;
    if (totalStress > 0) {
      const max = Math.max(stressCounts.low, stressCounts.medium, stressCounts.high);
      if (max === stressCounts.low) mostCommonStress = 'low';
      else if (max === stressCounts.medium) mostCommonStress = 'medium';
      else mostCommonStress = 'high';
    }

    // Stress trend: compare first half vs second half
    const stressNumeric = (level: string | null): number => {
      if (level === 'low') return 1;
      if (level === 'medium') return 2;
      if (level === 'high') return 3;
      return 0;
    };
    const midpoint = Math.floor(dateList.length / 2);
    const firstHalfDates = new Set(dateList.slice(0, midpoint));
    const firstHalf = submittedReports.filter((r) =>
      firstHalfDates.has(r.report_date as string),
    );
    const secondHalf = submittedReports.filter(
      (r) => !firstHalfDates.has(r.report_date as string),
    );
    const firstAvg =
      firstHalf.length > 0
        ? firstHalf.reduce((s, r) => s + stressNumeric(r.stress_level as string | null), 0) /
          firstHalf.length
        : 0;
    const secondAvg =
      secondHalf.length > 0
        ? secondHalf.reduce((s, r) => s + stressNumeric(r.stress_level as string | null), 0) /
          secondHalf.length
        : 0;
    let stressTrendVal = 0;
    if (firstAvg > 0 && secondAvg > 0) {
      if (secondAvg > firstAvg + 0.3) stressTrendVal = 1;
      else if (secondAvg < firstAvg - 0.3) stressTrendVal = -1;
    }

    // Avg tasks per day
    const avgTasksPerDay = days > 0 ? tasks.length / days : 0;
    const teamAvgTasksPerDay =
      memberCount > 0 && days > 0
        ? allTeamTasks.length / (memberCount * days)
        : 0;

    // Build report lookup by date
    const reportByDate = new Map<string, Record<string, unknown>>();
    for (const r of reports) {
      reportByDate.set(r.report_date as string, r);
    }

    // Tasks grouped by report_id
    const tasksByReportId = new Map<string, Record<string, unknown>[]>();
    for (const t of tasks) {
      const rid = t.report_id as string;
      if (!tasksByReportId.has(rid)) tasksByReportId.set(rid, []);
      tasksByReportId.get(rid)!.push(t);
    }

    // Team hours by date for comparison
    const teamHoursByDate = new Map<string, number>();
    const teamReportDateMap = new Map<string, string>();
    for (const r of teamReports) {
      teamReportDateMap.set(r.id as string, r.report_date as string);
    }
    for (const t of allTeamTasks) {
      const date = teamReportDateMap.get(t.report_id as string);
      if (date) {
        teamHoursByDate.set(
          date,
          (teamHoursByDate.get(date) || 0) + ((t.estimated_hours as number) || 0),
        );
      }
    }

    // Daily hours
    const dailyHours = dateList.map((date) => {
      const report = reportByDate.get(date);
      let hours = 0;
      if (report) {
        const reportTasks = tasksByReportId.get(report.id as string) ?? [];
        hours = reportTasks.reduce(
          (s, t) => s + ((t.estimated_hours as number) || 0),
          0,
        );
      }
      const teamDayTotal = teamHoursByDate.get(date) || 0;
      const teamAvg = memberCount > 0 ? teamDayTotal / memberCount : 0;
      return {
        date,
        hours: Math.round(hours * 100) / 100,
        teamAvg: Math.round(teamAvg * 100) / 100,
      };
    });

    // Stress timeline
    const stressTimeline = dateList.map((date) => {
      const report = reportByDate.get(date);
      return {
        date,
        level:
          report && report.status === 'submitted'
            ? ((report.stress_level as StressLevel | null) ?? null)
            : null,
      };
    });

    // Daily tasks
    const dailyTasks = dateList.map((date) => {
      const report = reportByDate.get(date);
      const count = report
        ? (tasksByReportId.get(report.id as string) ?? []).length
        : 0;
      return { date, count };
    });

    // Submission calendar
    const submissionCalendar = dateList.map((date) => {
      const report = reportByDate.get(date);
      return {
        date,
        submitted: report?.status === 'submitted',
      };
    });

    return {
      range,
      startDate,
      endDate,
      userId,
      displayName,
      summary: {
        submissionStreak,
        avgHours: Math.round(avgHours * 100) / 100,
        teamAvgHours: Math.round(teamAvgHours * 100) / 100,
        mostCommonStress,
        stressTrend: stressTrendVal,
        avgTasksPerDay: Math.round(avgTasksPerDay * 100) / 100,
        teamAvgTasksPerDay: Math.round(teamAvgTasksPerDay * 100) / 100,
      },
      dailyHours,
      stressTimeline,
      dailyTasks,
      submissionCalendar,
    };
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private getDateList(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const current = new Date(startDate + 'T00:00:00Z');
    const end = new Date(endDate + 'T00:00:00Z');
    while (current <= end) {
      dates.push(this.formatDate(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return dates;
  }
}
