import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { SupabaseService } from '../supabase/supabase.service';
import { createMockSupabaseService } from '../../test/setup';

describe('TasksService', () => {
  let service: TasksService;
  let mockQueryBuilder: ReturnType<typeof createMockSupabaseService>['mockQueryBuilder'];
  let mockClient: ReturnType<typeof createMockSupabaseService>['mockClient'];

  beforeEach(async () => {
    const {
      service: supabaseService,
      mockQueryBuilder: qb,
      mockClient: client,
    } = createMockSupabaseService();
    mockQueryBuilder = qb;
    mockClient = client;

    const module = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: SupabaseService, useValue: supabaseService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe('createTask', () => {
    it('should auto-create daily_report if none exists and insert task', async () => {
      const reportRow = {
        id: 'report-1',
        user_id: 'user-1',
        team_id: 'team-1',
        report_date: '2026-03-06',
        status: 'draft',
        submitted_at: null,
        created_at: '2026-03-06T00:00:00Z',
        updated_at: '2026-03-06T00:00:00Z',
      };
      const taskRow = {
        id: 'task-1',
        report_id: 'report-1',
        title: 'My Task',
        estimated_hours: 2,
        source_link: null,
        notes: null,
        sort_order: 0,
        created_at: '2026-03-06T00:00:00Z',
        updated_at: '2026-03-06T00:00:00Z',
      };

      // getOrCreateReport upsert -> select -> single
      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: reportRow, error: null })
        // createTask insert -> select -> single
        .mockResolvedValueOnce({ data: taskRow, error: null });

      const result = await service.createTask('user-1', {
        title: 'My Task',
        estimatedHours: 2,
        reportDate: '2026-03-06',
        teamId: 'team-1',
      });

      expect(result.id).toBe('task-1');
      expect(result.title).toBe('My Task');
      expect(result.reportId).toBe('report-1');
      expect(mockQueryBuilder.upsert).toHaveBeenCalled();
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          report_id: 'report-1',
          title: 'My Task',
          estimated_hours: 2,
        }),
      );
    });

    it('should add task to existing draft report', async () => {
      const reportRow = {
        id: 'report-1',
        user_id: 'user-1',
        team_id: 'team-1',
        report_date: '2026-03-06',
        status: 'draft',
        submitted_at: null,
        created_at: '2026-03-06T00:00:00Z',
        updated_at: '2026-03-06T00:00:00Z',
      };
      const taskRow = {
        id: 'task-2',
        report_id: 'report-1',
        title: 'Second Task',
        estimated_hours: 1.5,
        source_link: 'https://example.com',
        notes: 'Some notes',
        sort_order: 1,
        created_at: '2026-03-06T00:00:00Z',
        updated_at: '2026-03-06T00:00:00Z',
      };

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: reportRow, error: null })
        .mockResolvedValueOnce({ data: taskRow, error: null });

      const result = await service.createTask('user-1', {
        title: 'Second Task',
        estimatedHours: 1.5,
        sourceLink: 'https://example.com',
        notes: 'Some notes',
        reportDate: '2026-03-06',
        teamId: 'team-1',
      });

      expect(result.id).toBe('task-2');
      expect(result.sourceLink).toBe('https://example.com');
      expect(result.notes).toBe('Some notes');
    });

    it('should reject task creation on submitted report', async () => {
      const reportRow = {
        id: 'report-1',
        user_id: 'user-1',
        team_id: 'team-1',
        report_date: '2026-03-06',
        status: 'submitted',
        submitted_at: '2026-03-06T10:00:00Z',
        created_at: '2026-03-06T00:00:00Z',
        updated_at: '2026-03-06T10:00:00Z',
      };

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: reportRow, error: null });

      await expect(
        service.createTask('user-1', {
          title: 'New Task',
          estimatedHours: 1,
          reportDate: '2026-03-06',
          teamId: 'team-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateTask', () => {
    it('should update task fields on draft report', async () => {
      const taskRow = { report_id: 'report-1' };
      const ownerRow = { user_id: 'user-1', status: 'draft' };
      const updatedTaskRow = {
        id: 'task-1',
        report_id: 'report-1',
        title: 'Updated Title',
        estimated_hours: 3,
        source_link: null,
        notes: null,
        sort_order: 0,
        created_at: '2026-03-06T00:00:00Z',
        updated_at: '2026-03-06T01:00:00Z',
      };

      mockQueryBuilder.single
        // fetch task
        .mockResolvedValueOnce({ data: taskRow, error: null })
        // assertReportOwner
        .mockResolvedValueOnce({ data: ownerRow, error: null })
        // update task
        .mockResolvedValueOnce({ data: updatedTaskRow, error: null });

      const result = await service.updateTask('user-1', 'task-1', {
        title: 'Updated Title',
        estimatedHours: 3,
      });

      expect(result.title).toBe('Updated Title');
      expect(result.estimatedHours).toBe(3);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Updated Title',
          estimated_hours: 3,
        }),
      );
    });

    it('should reject update on submitted report', async () => {
      const taskRow = { report_id: 'report-1' };
      const ownerRow = { user_id: 'user-1', status: 'submitted' };

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: taskRow, error: null })
        .mockResolvedValueOnce({ data: ownerRow, error: null });

      await expect(
        service.updateTask('user-1', 'task-1', { title: 'New Title' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteTask', () => {
    it('should delete task from draft report', async () => {
      const taskRow = { report_id: 'report-1' };
      const ownerRow = { user_id: 'user-1', status: 'draft' };

      mockQueryBuilder.single
        // fetch task
        .mockResolvedValueOnce({ data: taskRow, error: null })
        // assertReportOwner
        .mockResolvedValueOnce({ data: ownerRow, error: null });

      await service.deleteTask('user-1', 'task-1');

      expect(mockQueryBuilder.delete).toHaveBeenCalled();
    });

    it('should reject delete on submitted report', async () => {
      const taskRow = { report_id: 'report-1' };
      const ownerRow = { user_id: 'user-1', status: 'submitted' };

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: taskRow, error: null })
        .mockResolvedValueOnce({ data: ownerRow, error: null });

      await expect(
        service.deleteTask('user-1', 'task-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getDailyReport', () => {
    it('should return report with tasks for a given date', async () => {
      const reportRow = {
        id: 'report-1',
        user_id: 'user-1',
        team_id: 'team-1',
        report_date: '2026-03-06',
        status: 'draft',
        submitted_at: null,
        created_at: '2026-03-06T00:00:00Z',
        updated_at: '2026-03-06T00:00:00Z',
      };
      const taskRows = [
        {
          id: 'task-1',
          report_id: 'report-1',
          title: 'Task A',
          estimated_hours: 2,
          source_link: null,
          notes: null,
          sort_order: 0,
          created_at: '2026-03-06T00:00:00Z',
          updated_at: '2026-03-06T00:00:00Z',
        },
        {
          id: 'task-2',
          report_id: 'report-1',
          title: 'Task B',
          estimated_hours: 3,
          source_link: null,
          notes: null,
          sort_order: 1,
          created_at: '2026-03-06T00:00:00Z',
          updated_at: '2026-03-06T00:00:00Z',
        },
      ];

      // maybeSingle for daily_reports query
      mockQueryBuilder.maybeSingle
        .mockResolvedValueOnce({ data: reportRow, error: null });

      // order().order() returns mockQueryBuilder, which resolves with data
      // We need the final call to return the tasks array.
      // Since order() returns this, the chain ends without single/maybeSingle.
      // The Supabase client returns a PromiseLike from the builder itself.
      // For testing, we need to mock the resolution of the builder after order().
      // The mock setup chains return this, so the last chainable mock resolves.
      // We override order to return a thenable on the second call.
      let orderCallCount = 0;
      mockQueryBuilder.order.mockImplementation(() => {
        orderCallCount++;
        if (orderCallCount >= 2) {
          // Second order call: return a thenable with task data
          return {
            ...mockQueryBuilder,
            then: (resolve: (v: unknown) => void) =>
              resolve({ data: taskRows, error: null }),
          };
        }
        return mockQueryBuilder;
      });

      const result = await service.getDailyReport('user-1', 'team-1', '2026-03-06');

      expect(result).not.toBeNull();
      expect(result!.report.id).toBe('report-1');
      expect(result!.tasks).toHaveLength(2);
      expect(result!.totalHours).toBe(5);
    });

    it('should return null when no report exists for date', async () => {
      mockQueryBuilder.maybeSingle
        .mockResolvedValueOnce({ data: null, error: null });

      const result = await service.getDailyReport('user-1', 'team-1', '2026-03-06');

      expect(result).toBeNull();
    });
  });

  describe('submitReport', () => {
    it('should change status from draft to submitted with timestamp', async () => {
      const ownerRow = { user_id: 'user-1', status: 'draft' };
      const taskRows = [{ id: 'task-1' }];
      const updatedReport = {
        id: 'report-1',
        user_id: 'user-1',
        team_id: 'team-1',
        report_date: '2026-03-06',
        status: 'submitted',
        submitted_at: '2026-03-06T12:00:00Z',
        created_at: '2026-03-06T00:00:00Z',
        updated_at: '2026-03-06T12:00:00Z',
      };

      mockQueryBuilder.single
        // assertReportOwner
        .mockResolvedValueOnce({ data: ownerRow, error: null })
        // update report -> single
        .mockResolvedValueOnce({ data: updatedReport, error: null });

      // Track eq calls to intercept the tasks count query
      // assertReportOwner: from('daily_reports').select(...).eq('id', reportId).single() -- eq call 1
      // tasks count: from('tasks').select('id').eq('report_id', reportId) -- eq call 2
      // update: from('daily_reports').update(...).eq('id', reportId).select().single() -- eq call 3
      let eqCallCount = 0;
      mockQueryBuilder.eq.mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount === 2) {
          // Return a thenable for the tasks count query
          return {
            ...mockQueryBuilder,
            then: (resolve: (v: unknown) => void) =>
              resolve({ data: taskRows, error: null }),
          };
        }
        return mockQueryBuilder;
      });

      const result = await service.submitReport('user-1', 'report-1');

      expect(result.status).toBe('submitted');
      expect(result.submittedAt).toBe('2026-03-06T12:00:00Z');
    });

    it('should reject submitting an already submitted report', async () => {
      const ownerRow = { user_id: 'user-1', status: 'submitted' };

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: ownerRow, error: null });

      await expect(
        service.submitReport('user-1', 'report-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject submitting a report with zero tasks', async () => {
      const ownerRow = { user_id: 'user-1', status: 'draft' };

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: ownerRow, error: null });

      // Tasks query returns empty array
      let eqCallCount = 0;
      mockQueryBuilder.eq.mockImplementation(() => {
        eqCallCount++;
        // After assertReportOwner (2 eq calls), the 3rd eq is for task count
        if (eqCallCount === 3) {
          return {
            ...mockQueryBuilder,
            then: (resolve: (v: unknown) => void) =>
              resolve({ data: [], error: null }),
          };
        }
        return mockQueryBuilder;
      });

      await expect(
        service.submitReport('user-1', 'report-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
