import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { Test } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { SupabaseService } from '../supabase/supabase.service';

function createMockQueryBuilder() {
  const qb: Record<string, Mock> = {};
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'in', 'not', 'is',
    'gt', 'lt', 'gte', 'lte',
    'order', 'limit',
  ];
  for (const m of methods) {
    qb[m] = vi.fn().mockReturnValue(qb);
  }
  qb.single = vi.fn().mockResolvedValue({ data: null, error: null });
  qb.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  return qb;
}

const TEAM_ID = 'team-001';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockClient: { from: Mock };

  beforeEach(async () => {
    mockClient = {
      from: vi.fn().mockReturnValue(createMockQueryBuilder()),
    };

    const module = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: SupabaseService,
          useValue: { getClient: vi.fn().mockReturnValue(mockClient) },
        },
      ],
    }).compile();

    service = module.get(AnalyticsService);
  });

  describe('getDateRange', () => {
    it('returns 7-day range for week', () => {
      const result = service.getDateRange('week');
      const start = new Date(result.startDate);
      const end = new Date(result.endDate);
      const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      expect(diff).toBe(6); // 7 days inclusive
      expect(result.prevStartDate).toBeDefined();
      expect(result.prevEndDate).toBeDefined();
    });

    it('returns 30-day range for month', () => {
      const result = service.getDateRange('month');
      const start = new Date(result.startDate);
      const end = new Date(result.endDate);
      const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      expect(diff).toBe(29); // 30 days inclusive
    });

    it('returns 90-day range for quarter', () => {
      const result = service.getDateRange('quarter');
      const start = new Date(result.startDate);
      const end = new Date(result.endDate);
      const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      expect(diff).toBe(89); // 90 days inclusive
    });

    it('previous period ends one day before current period starts', () => {
      const result = service.getDateRange('week');
      const prevEnd = new Date(result.prevEndDate);
      const start = new Date(result.startDate);
      const diff = (start.getTime() - prevEnd.getTime()) / (1000 * 60 * 60 * 24);
      expect(diff).toBe(1);
    });
  });

  describe('getTeamAnalytics', () => {
    it('returns correctly structured response with mock data', async () => {
      // Setup sequential mock responses for each from() call:
      // 1. team_members -> select().eq().is()
      // 2. users -> select().in()
      // 3. daily_reports (current) -> select().eq().gte().lte()
      // 4. daily_reports (prev) -> select().eq().gte().lte()
      // 5. tasks (current) -> select().in()
      // 6. tasks (prev) -> select().in()

      const builders: ReturnType<typeof createMockQueryBuilder>[] = [];
      for (let i = 0; i < 6; i++) {
        builders.push(createMockQueryBuilder());
      }

      // team_members: terminal is .is('left_at', null)
      builders[0].is.mockResolvedValueOnce({
        data: [{ user_id: 'user-a' }, { user_id: 'user-b' }],
        error: null,
      });

      // users: terminal is .in('id', ...)
      builders[1].in.mockResolvedValueOnce({
        data: [
          { id: 'user-a', display_name: 'Alice' },
          { id: 'user-b', display_name: 'Bob' },
        ],
        error: null,
      });

      // daily_reports current: terminal is .lte()
      const today = new Date().toISOString().slice(0, 10);
      builders[2].lte.mockResolvedValueOnce({
        data: [
          {
            id: 'report-a',
            user_id: 'user-a',
            report_date: today,
            status: 'submitted',
            stress_level: 'low',
          },
        ],
        error: null,
      });

      // daily_reports prev: terminal is .lte()
      builders[3].lte.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // tasks current: terminal is .in()
      builders[4].in.mockResolvedValueOnce({
        data: [
          {
            id: 'task-1',
            report_id: 'report-a',
            estimated_hours: 3,
          },
        ],
        error: null,
      });

      // tasks prev: terminal is .in()
      builders[5].in.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      let callIndex = 0;
      mockClient.from.mockImplementation(() => builders[callIndex++] ?? createMockQueryBuilder());

      const result = await service.getTeamAnalytics(TEAM_ID, 'week');

      expect(result.range).toBe('week');
      expect(result.startDate).toBeDefined();
      expect(result.endDate).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.submissionRate).toBeGreaterThanOrEqual(0);
      expect(result.summary.stressDistribution).toEqual(
        expect.objectContaining({ low: expect.any(Number), medium: expect.any(Number), high: expect.any(Number) }),
      );
      expect(result.submissionRates).toBeInstanceOf(Array);
      expect(result.heatmap).toBeInstanceOf(Array);
      expect(result.stressTrend).toBeInstanceOf(Array);
      expect(result.taskVolumeByMember).toBeInstanceOf(Array);
    });
  });

  describe('getMemberAnalytics', () => {
    it('returns correctly structured response with mock data', async () => {
      // Sequential from() calls:
      // 1. users -> select().eq().single()
      // 2. daily_reports (member) -> select().eq().eq().gte().lte()
      // 3. tasks -> select().in()
      // 4. daily_reports (team) -> select().eq().gte().lte()
      // 5. tasks (team) -> select().in()
      // 6. team_members -> select().eq().is()
      // 7. daily_reports (streak) -> select().eq().eq().eq().order().limit()

      const builders: ReturnType<typeof createMockQueryBuilder>[] = [];
      for (let i = 0; i < 7; i++) {
        builders.push(createMockQueryBuilder());
      }

      const today = new Date().toISOString().slice(0, 10);

      // users: terminal is .single()
      builders[0].single.mockResolvedValueOnce({
        data: { id: 'user-a', display_name: 'Alice' },
        error: null,
      });

      // member reports: terminal is .lte()
      builders[1].lte.mockResolvedValueOnce({
        data: [
          {
            id: 'report-a',
            user_id: 'user-a',
            report_date: today,
            status: 'submitted',
            stress_level: 'medium',
          },
        ],
        error: null,
      });

      // member tasks: terminal is .in()
      builders[2].in.mockResolvedValueOnce({
        data: [
          { id: 'task-1', report_id: 'report-a', estimated_hours: 4 },
          { id: 'task-2', report_id: 'report-a', estimated_hours: 2 },
        ],
        error: null,
      });

      // team reports: terminal is .lte()
      builders[3].lte.mockResolvedValueOnce({
        data: [
          {
            id: 'report-a',
            user_id: 'user-a',
            report_date: today,
            status: 'submitted',
            stress_level: 'medium',
          },
        ],
        error: null,
      });

      // team tasks: terminal is .in()
      builders[4].in.mockResolvedValueOnce({
        data: [
          { id: 'task-1', report_id: 'report-a', estimated_hours: 4 },
          { id: 'task-2', report_id: 'report-a', estimated_hours: 2 },
        ],
        error: null,
      });

      // team_members: terminal is .is()
      builders[5].is.mockResolvedValueOnce({
        data: [{ user_id: 'user-a' }, { user_id: 'user-b' }],
        error: null,
      });

      // streak reports: terminal is .limit()
      builders[6].limit.mockResolvedValueOnce({
        data: [{ report_date: today }],
        error: null,
      });

      let callIndex = 0;
      mockClient.from.mockImplementation(() => builders[callIndex++] ?? createMockQueryBuilder());

      const result = await service.getMemberAnalytics(TEAM_ID, 'user-a', 'week');

      expect(result.range).toBe('week');
      expect(result.userId).toBe('user-a');
      expect(result.displayName).toBe('Alice');
      expect(result.summary).toBeDefined();
      expect(result.summary.submissionStreak).toBeGreaterThanOrEqual(0);
      expect(result.summary.avgHours).toBeGreaterThanOrEqual(0);
      expect(result.summary.teamAvgHours).toBeGreaterThanOrEqual(0);
      expect(result.dailyHours).toBeInstanceOf(Array);
      expect(result.stressTimeline).toBeInstanceOf(Array);
      expect(result.dailyTasks).toBeInstanceOf(Array);
      expect(result.submissionCalendar).toBeInstanceOf(Array);
      expect(result.submissionCalendar.length).toBe(7);
    });
  });
});
