import { describe, it, expect } from 'vitest';
import {
  escapeCsvField,
  teamAnalyticsToCsv,
  memberAnalyticsToCsv,
} from '../export-csv';
import type {
  TeamAnalyticsResponse,
  MemberAnalyticsResponse,
} from '@daily-report/shared';

describe('escapeCsvField', () => {
  it('wraps strings in double quotes', () => {
    expect(escapeCsvField('hello')).toBe('"hello"');
  });

  it('escapes internal double quotes by doubling them', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  it('passes numbers through as strings', () => {
    expect(escapeCsvField(42)).toBe('42');
    expect(escapeCsvField(3.14)).toBe('3.14');
  });
});

describe('teamAnalyticsToCsv', () => {
  const mockData: TeamAnalyticsResponse = {
    range: 'week',
    startDate: '2026-03-01',
    endDate: '2026-03-07',
    summary: {
      submissionRate: 85,
      submissionRateTrend: 5,
      avgHoursPerDay: 7.5,
      avgHoursPerDayTrend: -0.3,
      stressDistribution: { low: 5, medium: 3, high: 2 },
      taskCount: 45,
      taskCountTrend: 3,
    },
    submissionRates: [
      { date: '2026-03-01', rate: 80, submitted: 4, total: 5 },
      { date: '2026-03-02', rate: 100, submitted: 5, total: 5 },
    ],
    stressTrend: [
      { date: '2026-03-01', low: 3, medium: 1, high: 1 },
    ],
    taskVolumeByMember: [
      { userId: 'u1', displayName: 'Alice', taskCount: 12 },
    ],
    heatmap: [
      { userId: 'u1', displayName: 'Alice', date: '2026-03-01', hours: 8 },
    ],
  };

  it('contains Submission Rates section header', () => {
    const csv = teamAnalyticsToCsv(mockData);
    expect(csv).toContain('Submission Rates');
  });

  it('contains correct Date,Rate columns', () => {
    const csv = teamAnalyticsToCsv(mockData);
    expect(csv).toContain('Date,Rate (%),Submitted,Total');
    expect(csv).toContain('"2026-03-01",80,4,5');
    expect(csv).toContain('"2026-03-02",100,5,5');
  });

  it('contains Stress Trend section header', () => {
    const csv = teamAnalyticsToCsv(mockData);
    expect(csv).toContain('Stress Trend');
  });

  it('contains Task Volume by Member section header', () => {
    const csv = teamAnalyticsToCsv(mockData);
    expect(csv).toContain('Task Volume by Member');
  });

  it('contains Workload Heatmap section header', () => {
    const csv = teamAnalyticsToCsv(mockData);
    expect(csv).toContain('Workload Heatmap');
  });

  it('separates sections with blank lines', () => {
    const csv = teamAnalyticsToCsv(mockData);
    const lines = csv.split('\n');
    // Find blank lines between sections
    const blankLineIndices = lines
      .map((line, i) => (line === '' ? i : -1))
      .filter((i) => i !== -1);
    expect(blankLineIndices.length).toBeGreaterThanOrEqual(3);
  });
});

describe('memberAnalyticsToCsv', () => {
  const mockData: MemberAnalyticsResponse = {
    range: 'week',
    startDate: '2026-03-01',
    endDate: '2026-03-07',
    userId: 'u1',
    displayName: 'Alice',
    summary: {
      submissionStreak: 5,
      avgHours: 7.5,
      teamAvgHours: 7.0,
      mostCommonStress: 'low',
      stressTrend: 0,
      avgTasksPerDay: 3,
      teamAvgTasksPerDay: 2.5,
    },
    dailyHours: [
      { date: '2026-03-01', hours: 8, teamAvg: 7 },
    ],
    stressTimeline: [
      { date: '2026-03-01', level: 'low' },
    ],
    dailyTasks: [
      { date: '2026-03-01', count: 4 },
    ],
    submissionCalendar: [
      { date: '2026-03-01', submitted: true },
      { date: '2026-03-02', submitted: false },
    ],
  };

  it('contains all 4 section headers', () => {
    const csv = memberAnalyticsToCsv(mockData);
    expect(csv).toContain('Daily Hours');
    expect(csv).toContain('Stress Timeline');
    expect(csv).toContain('Daily Tasks');
    expect(csv).toContain('Submission Calendar');
  });

  it('shows yes/no for submitted field', () => {
    const csv = memberAnalyticsToCsv(mockData);
    expect(csv).toContain('"2026-03-01",yes');
    expect(csv).toContain('"2026-03-02",no');
  });
});
