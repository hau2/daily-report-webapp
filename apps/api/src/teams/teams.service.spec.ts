import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TeamsService } from './teams.service';
import { SupabaseService } from '../supabase/supabase.service';
import { EmailService } from '../email/email.service';
import { createMockSupabaseService } from '../../test/setup';

describe('TeamsService', () => {
  let service: TeamsService;
  let mockQueryBuilder: ReturnType<typeof createMockSupabaseService>['mockQueryBuilder'];
  let mockJwtService: { signAsync: ReturnType<typeof vi.fn>; verifyAsync: ReturnType<typeof vi.fn> };
  let mockEmailService: { sendTeamInvitationEmail: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const { service: supabaseService, mockQueryBuilder: qb } = createMockSupabaseService();
    mockQueryBuilder = qb;

    mockJwtService = {
      signAsync: vi.fn().mockResolvedValue('mock-token'),
      verifyAsync: vi.fn(),
    };

    mockEmailService = {
      sendTeamInvitationEmail: vi.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: SupabaseService, useValue: supabaseService },
        { provide: JwtService, useValue: mockJwtService },
        {
          provide: ConfigService,
          useValue: { getOrThrow: vi.fn().mockReturnValue('test-secret') },
        },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  describe('createTeam', () => {
    it('should insert team row then insert team_members row as owner', async () => {
      const teamRow = {
        id: 'team-1',
        name: 'My Team',
        created_by: 'user-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      const memberRow = {
        id: 'member-1',
        team_id: 'team-1',
        user_id: 'user-1',
        role: 'owner',
      };

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: teamRow, error: null })
        .mockResolvedValueOnce({ data: memberRow, error: null });

      await service.createTeam('user-1', { name: 'My Team' });

      // First single() call is for team insert
      // Second single() call is for team_members insert
      expect(mockQueryBuilder.single).toHaveBeenCalledTimes(2);
    });

    it('should return the created team with role owner', async () => {
      const teamRow = {
        id: 'team-1',
        name: 'My Team',
        created_by: 'user-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      const memberRow = {
        id: 'member-1',
        team_id: 'team-1',
        user_id: 'user-1',
        role: 'owner',
      };

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: teamRow, error: null })
        .mockResolvedValueOnce({ data: memberRow, error: null });

      const result = await service.createTeam('user-1', { name: 'My Team' });

      expect(result).toEqual(teamRow);
      expect(result.id).toBe('team-1');
    });
  });

  describe('inviteMember', () => {
    it('should throw ForbiddenException if caller is not an owner', async () => {
      // Return role='member' when checking team_members
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { role: 'member' },
        error: null,
      });

      await expect(
        service.inviteMember('team-1', 'user-1', { email: 'invite@example.com' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should store token_hash and call emailService.sendTeamInvitationEmail', async () => {
      // First single() - team_members check (owner)
      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: { role: 'owner' }, error: null })
        // Second single() - team info
        .mockResolvedValueOnce({ data: { name: 'My Team', created_by: 'user-1' }, error: null })
        // Third single() - inviter info
        .mockResolvedValueOnce({ data: { display_name: 'Alice', email: 'alice@example.com' }, error: null });

      await service.inviteMember('team-1', 'user-1', { email: 'invite@example.com' });

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          purpose: 'team-invitation',
          teamId: 'team-1',
          inviteeEmail: 'invite@example.com',
        }),
        expect.objectContaining({ expiresIn: '7d' }),
      );
      expect(mockEmailService.sendTeamInvitationEmail).toHaveBeenCalledWith(
        'invite@example.com',
        expect.any(String),
        expect.any(String),
        'mock-token',
      );
      // insert should have been called with token_hash (SHA-256 of 'mock-token')
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ token_hash: expect.any(String) }),
      );
    });
  });

  describe('acceptInvitation', () => {
    it('should throw ForbiddenException if inviteeEmail does not match current user email', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        sub: 'user-1',
        purpose: 'team-invitation',
        teamId: 'team-1',
        inviteeEmail: 'other@example.com',
      });

      await expect(
        service.acceptInvitation('some-token', { userId: 'user-2', email: 'user@example.com' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if invitation is already used', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        sub: 'user-1',
        purpose: 'team-invitation',
        teamId: 'team-1',
        inviteeEmail: 'user@example.com',
      });

      // Return invitation with used_at set (already used)
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { id: 'inv-1', token_hash: 'hash', used_at: '2026-01-01T00:00:00Z' },
        error: null,
      });

      await expect(
        service.acceptInvitation('some-token', { userId: 'user-2', email: 'user@example.com' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should insert team_members row and set used_at on invitation', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        sub: 'user-1',
        purpose: 'team-invitation',
        teamId: 'team-1',
        inviteeEmail: 'user@example.com',
      });

      // Return pending invitation (used_at = null)
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { id: 'inv-1', token_hash: 'hash', used_at: null },
        error: null,
      });

      const result = await service.acceptInvitation('some-token', {
        userId: 'user-2',
        email: 'user@example.com',
      });

      expect(result).toEqual({ teamId: 'team-1' });
      // insert called with team_members row
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ team_id: 'team-1', user_id: 'user-2', role: 'member' }),
      );
      // update called to set used_at
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ used_at: expect.any(String) }),
      );
    });
  });

  describe('removeMember', () => {
    it('should throw BadRequestException if trying to remove yourself', async () => {
      await expect(
        service.removeMember('team-1', 'user-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if target member not found', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(
        service.removeMember('team-1', 'user-1', 'user-2'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if target is owner', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { id: 'member-2', role: 'owner' },
        error: null,
      });

      await expect(
        service.removeMember('team-1', 'user-1', 'user-2'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set left_at on the member row on success', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { id: 'member-2', role: 'member' },
        error: null,
      });

      await service.removeMember('team-1', 'user-1', 'user-2');

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ left_at: expect.any(String) }),
      );
    });
  });

  describe('leaveTeam', () => {
    it('should throw NotFoundException if user is not an active member', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(
        service.leaveTeam('team-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is the owner', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { id: 'member-1', role: 'owner' },
        error: null,
      });

      await expect(
        service.leaveTeam('team-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set left_at on the member row on success', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { id: 'member-1', role: 'member' },
        error: null,
      });

      await service.leaveTeam('team-1', 'user-1');

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ left_at: expect.any(String) }),
      );
    });
  });

  describe('transferOwnership', () => {
    it('should throw BadRequestException if transferring to yourself', async () => {
      await expect(
        service.transferOwnership('team-1', 'user-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if target member not found', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(
        service.transferOwnership('team-1', 'user-1', 'user-2'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update target role to owner and current owner to member', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { id: 'member-2', role: 'member' },
        error: null,
      });

      await service.transferOwnership('team-1', 'user-1', 'user-2');

      // update called twice: once for target (owner), once for current owner (member)
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ role: 'owner' });
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ role: 'member' });
    });
  });

  describe('cancelInvitation', () => {
    it('should throw NotFoundException if no pending invitation found', async () => {
      // select() after delete returns empty array
      mockQueryBuilder.select.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await expect(
        service.cancelInvitation('team-1', 'invite@example.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete the invitation on success', async () => {
      mockQueryBuilder.select.mockResolvedValueOnce({
        data: [{ id: 'inv-1' }],
        error: null,
      });

      await service.cancelInvitation('team-1', 'invite@example.com');

      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('team_id', 'team-1');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('invitee_email', 'invite@example.com');
    });
  });

  describe('deleteTeam', () => {
    it('should delete all related data in correct order', async () => {
      // The first chained query is .from('daily_reports').select('id').eq('team_id', teamId)
      // which ends without .single() — the mock chain resolves via eq
      // We need eq to resolve with data at some point for the select query
      mockQueryBuilder.eq.mockResolvedValueOnce({
        data: [{ id: 'report-1' }, { id: 'report-2' }],
        error: null,
      });

      await service.deleteTeam('team-1');

      // delete should have been called multiple times
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
    });

    it('should handle team with no reports', async () => {
      mockQueryBuilder.eq.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await service.deleteTeam('team-1');

      // Should still delete team_invitations, team_members, and team
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
    });
  });
});
