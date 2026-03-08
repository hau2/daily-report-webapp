import type { StressLevel } from './task';

export type AnalyticsRange = 'week' | 'month' | 'quarter';

// --- Team Overview ---

export interface TeamAnalyticsSummary {
  submissionRate: number;        // 0-100 percentage
  submissionRateTrend: number;   // difference vs previous period (positive = up)
  avgHoursPerDay: number;
  avgHoursPerDayTrend: number;
  stressDistribution: { low: number; medium: number; high: number };
  taskCount: number;
  taskCountTrend: number;
}

export interface DailySubmissionRate {
  date: string;   // YYYY-MM-DD
  rate: number;    // 0-100
  submitted: number;
  total: number;
}

export interface HeatmapCell {
  userId: string;
  displayName: string;
  date: string;
  hours: number;
}

export interface DailyStressDistribution {
  date: string;
  low: number;
  medium: number;
  high: number;
}

export interface MemberTaskVolume {
  userId: string;
  displayName: string;
  taskCount: number;
}

export interface TeamAnalyticsResponse {
  range: AnalyticsRange;
  startDate: string;
  endDate: string;
  summary: TeamAnalyticsSummary;
  submissionRates: DailySubmissionRate[];
  heatmap: HeatmapCell[];
  stressTrend: DailyStressDistribution[];
  taskVolumeByMember: MemberTaskVolume[];
}

// --- Individual Member ---

export interface MemberAnalyticsSummary {
  submissionStreak: number;       // consecutive days submitted (counting back from today)
  avgHours: number;
  teamAvgHours: number;
  mostCommonStress: StressLevel | null;
  stressTrend: number;           // direction: -1 (improving), 0 (stable), 1 (worsening)
  avgTasksPerDay: number;
  teamAvgTasksPerDay: number;
}

export interface DailyHoursEntry {
  date: string;
  hours: number;
  teamAvg: number;
}

export interface DailyStressEntry {
  date: string;
  level: StressLevel | null;
}

export interface DailyTaskCount {
  date: string;
  count: number;
}

export interface SubmissionCalendarDay {
  date: string;
  submitted: boolean;
}

export interface MemberAnalyticsResponse {
  range: AnalyticsRange;
  startDate: string;
  endDate: string;
  userId: string;
  displayName: string;
  summary: MemberAnalyticsSummary;
  dailyHours: DailyHoursEntry[];
  stressTimeline: DailyStressEntry[];
  dailyTasks: DailyTaskCount[];
  submissionCalendar: SubmissionCalendarDay[];
}
