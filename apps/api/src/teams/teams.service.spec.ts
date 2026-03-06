// Wave 0 RED stubs — implementation in Plan 02
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TeamsService } from './teams.service';
import { createMockSupabaseService } from '../../test/setup';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';

describe('TeamsService', () => {
  describe('createTeam', () => {
    it('should insert team row then insert team_members row as manager', () => {
      expect(true).toBe(false);
    });

    it('should return the created team with role manager', () => {
      expect(true).toBe(false);
    });
  });

  describe('inviteMember', () => {
    it('should throw ForbiddenException if caller is not a manager', () => {
      expect(true).toBe(false);
    });

    it('should store token_hash and call emailService.sendTeamInvitationEmail', () => {
      expect(true).toBe(false);
    });
  });

  describe('acceptInvitation', () => {
    it('should throw ForbiddenException if inviteeEmail does not match current user email', () => {
      expect(true).toBe(false);
    });

    it('should throw BadRequestException if invitation is already used', () => {
      expect(true).toBe(false);
    });

    it('should insert team_members row and set used_at on invitation', () => {
      expect(true).toBe(false);
    });
  });
});
