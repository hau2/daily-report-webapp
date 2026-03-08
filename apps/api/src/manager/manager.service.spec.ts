import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { Test } from '@nestjs/testing';
import { ManagerService } from './manager.service';
import { SupabaseService } from '../supabase/supabase.service';

// Helper to create a fresh mock query builder where all methods chain
// except terminal ones (single, maybeSingle, and the last call in a chain).
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
const DATE = '2026-03-06';

const MEMBER_A = { user_id: 'user-a', role: 'member' };
const MEMBER_B = { user_id: 'user-b', role: 'member' };
const USER_A = { id: 'user-a', email: 'alice@test.com', display_name: 'Alice' };
const USER_B = { id: 'user-b', email: 'bob@test.com', display_name: 'Bob' };

const REPORT_A = {
  id: 'report-a',
  user_id: 'user-a',
  team_id: TEAM_ID,
  report_date: DATE,
  status: 'submitted',
  submitted_at: '2026-03-06T10:00:00Z',
  created_at: '2026-03-06T08:00:00Z',
  updated_at: '2026-03-06T10:00:00Z',
};

const TASK_1 = {
  id: 'task-1',
  report_id: 'report-a',
  title: 'Do something',
  estimated_hours: 2,
  source_link: null,
  notes: null,
  sort_order: 0,
  created_at: '2026-03-06T08:00:00Z',
  updated_at: '2026-03-06T08:00:00Z',
};

const TASK_2 = {
  id: 'task-2',
  report_id: 'report-a',
  title: 'Another task',
  estimated_hours: 3,
  source_link: 'https://example.com',
  notes: 'Some notes',
  sort_order: 1,
  created_at: '2026-03-06T08:01:00Z',
  updated_at: '2026-03-06T08:01:00Z',
};

/**
 * Sets up mocks for getTeamReports flow:
 * 1. team_members: from().select().eq() -- terminal: eq
 * 2. users: from().select().in() -- terminal: in
 * 3. daily_reports: from().select().eq().eq() -- terminal: second eq
 * 4. tasks: from().select().in().order().order() -- terminal: second order
 */
function setupGetTeamReportsMocks(
  mockClient: { from: Mock },
  opts: {
    members: unknown[];
    users: unknown[];
    reports: unknown[];
    tasks: unknown[];
  },
) {
  // Create fresh query builders per from() call
  const membersQb = createMockQueryBuilder();
  const usersQb = createMockQueryBuilder();
  const reportsQb = createMockQueryBuilder();
  const tasksQb = createMockQueryBuilder();

  // team_members: .from('team_members').select('user_id, role').eq('team_id', teamId).is('left_at', null)
  // Terminal call is is (eq chains, is resolves)
  membersQb.is.mockResolvedValueOnce({ data: opts.members, error: null });

  // daily_reports: .from('daily_reports').select('*').eq('team_id', ...).eq('report_date', ...)
  // First eq returns self, second eq resolves
  reportsQb.eq
    .mockReturnValueOnce(reportsQb)  // first .eq('team_id', ...)
    .mockResolvedValueOnce({ data: opts.reports, error: null }); // second .eq('report_date', ...)

  // users: .from('users').select('id, email, display_name').in('id', userIds)
  usersQb.in.mockResolvedValueOnce({ data: opts.users, error: null });

  // tasks: .from('tasks').select('*').in('report_id', ...).order('sort_order').order('created_at')
  // Last order resolves
  tasksQb.order
    .mockReturnValueOnce(tasksQb) // first .order('sort_order')
    .mockResolvedValueOnce({ data: opts.tasks, error: null }); // second .order('created_at')

  const callOrder = [membersQb, reportsQb, usersQb, tasksQb];
  let callIndex = 0;
  mockClient.from.mockImplementation(() => {
    return callOrder[callIndex++] ?? createMockQueryBuilder();
  });
}

/**
 * Sets up mocks for getPendingSubmissions flow:
 * 1. team_members: from().select().eq() -- terminal: eq
 * 2. users: from().select().in() -- terminal: in
 * 3. daily_reports: from().select().eq().eq() -- terminal: second eq
 */
function setupGetPendingMocks(
  mockClient: { from: Mock },
  opts: {
    members: unknown[];
    users: unknown[];
    reports: unknown[];
  },
) {
  const membersQb = createMockQueryBuilder();
  const usersQb = createMockQueryBuilder();
  const reportsQb = createMockQueryBuilder();

  // team_members: .select().eq().is() -- terminal: is
  membersQb.is.mockResolvedValueOnce({ data: opts.members, error: null });
  usersQb.in.mockResolvedValueOnce({ data: opts.users, error: null });
  reportsQb.eq
    .mockReturnValueOnce(reportsQb)
    .mockResolvedValueOnce({ data: opts.reports, error: null });

  const callOrder = [membersQb, usersQb, reportsQb];
  let callIndex = 0;
  mockClient.from.mockImplementation(() => {
    return callOrder[callIndex++] ?? createMockQueryBuilder();
  });
}

describe('ManagerService', () => {
  let service: ManagerService;
  let mockClient: { from: Mock };

  beforeEach(async () => {
    mockClient = {
      from: vi.fn().mockReturnValue(createMockQueryBuilder()),
    };

    const module = await Test.createTestingModule({
      providers: [
        ManagerService,
        {
          provide: SupabaseService,
          useValue: { getClient: vi.fn().mockReturnValue(mockClient) },
        },
      ],
    }).compile();

    service = module.get(ManagerService);
  });

  describe('getTeamReports', () => {
    it('returns members with their reports and tasks', async () => {
      setupGetTeamReportsMocks(mockClient, {
        members: [MEMBER_A, MEMBER_B],
        users: [USER_A, USER_B],
        reports: [REPORT_A],
        tasks: [TASK_1, TASK_2],
      });

      const result = await service.getTeamReports(TEAM_ID, DATE);

      expect(result.date).toBe(DATE);
      expect(result.teamId).toBe(TEAM_ID);
      expect(result.members).toHaveLength(2);

      const alice = result.members.find((m) => m.userId === 'user-a');
      expect(alice).toBeDefined();
      expect(alice!.status).toBe('submitted');
      expect(alice!.tasks).toHaveLength(2);
      expect(alice!.totalHours).toBe(5);

      const bob = result.members.find((m) => m.userId === 'user-b');
      expect(bob).toBeDefined();
      expect(bob!.status).toBe('none');
      expect(bob!.tasks).toHaveLength(0);
      expect(bob!.totalHours).toBe(0);
    });

    it('returns status none for members without a report', async () => {
      setupGetTeamReportsMocks(mockClient, {
        members: [MEMBER_A],
        users: [USER_A],
        reports: [],
        tasks: [],
      });

      const result = await service.getTeamReports(TEAM_ID, DATE);
      expect(result.members[0].status).toBe('none');
      expect(result.members[0].report).toBeNull();
      expect(result.members[0].tasks).toEqual([]);
    });
  });

  describe('getPendingSubmissions', () => {
    it('returns members without submitted reports', async () => {
      setupGetPendingMocks(mockClient, {
        members: [MEMBER_A, MEMBER_B],
        users: [USER_A, USER_B],
        reports: [{ ...REPORT_A, status: 'submitted' }],
      });

      const result = await service.getPendingSubmissions(TEAM_ID, DATE);
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-b');
      expect(result[0].reportStatus).toBe('none');
    });

    it('includes members with draft reports as pending', async () => {
      const draftReport = { ...REPORT_A, status: 'draft', submitted_at: null };
      setupGetPendingMocks(mockClient, {
        members: [MEMBER_A, MEMBER_B],
        users: [USER_A, USER_B],
        reports: [draftReport],
      });

      const result = await service.getPendingSubmissions(TEAM_ID, DATE);
      expect(result).toHaveLength(2);

      const alice = result.find((m) => m.userId === 'user-a');
      expect(alice).toBeDefined();
      expect(alice!.reportStatus).toBe('draft');

      const bob = result.find((m) => m.userId === 'user-b');
      expect(bob).toBeDefined();
      expect(bob!.reportStatus).toBe('none');
    });
  });

  describe('generateCsv', () => {
    it('produces correct header and data rows', async () => {
      setupGetTeamReportsMocks(mockClient, {
        members: [MEMBER_A],
        users: [USER_A],
        reports: [REPORT_A],
        tasks: [TASK_1],
      });

      const csv = await service.generateCsv(TEAM_ID, DATE);
      const lines = csv.split('\n');

      expect(lines[0]).toBe(
        'Member Name,Email,Date,Report Status,Task,Hours,Source Link,Notes',
      );
      expect(lines[1]).toContain('Alice');
      expect(lines[1]).toContain('alice@test.com');
      expect(lines[1]).toContain('submitted');
      expect(lines[1]).toContain('Do something');
      expect(lines[1]).toContain('2');
    });

    it('escapes fields with commas and quotes', async () => {
      const taskWithSpecial = {
        ...TASK_1,
        title: 'Task with, comma',
        notes: 'Notes with "quotes"',
      };

      setupGetTeamReportsMocks(mockClient, {
        members: [MEMBER_A],
        users: [USER_A],
        reports: [REPORT_A],
        tasks: [taskWithSpecial],
      });

      const csv = await service.generateCsv(TEAM_ID, DATE);
      const lines = csv.split('\n');

      // Field with comma should be quoted
      expect(lines[1]).toContain('"Task with, comma"');
      // Field with quotes should have doubled quotes
      expect(lines[1]).toContain('"Notes with ""quotes"""');
    });
  });
});
