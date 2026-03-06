import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockSupabaseService } from '../../test/setup';
import { SupabaseService } from '../supabase/supabase.service';
import { UsersService } from './users.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';

// Mock argon2 at module level to avoid ESM spy restrictions
vi.mock('argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed-new-password'),
  verify: vi.fn().mockResolvedValue(true),
}));

const mockDbUser = {
  id: 'user-123',
  email: 'test@example.com',
  display_name: 'Test User',
  timezone: 'UTC',
  email_verified: true,
  password_hash: 'stored-hash',
  refresh_token_hash: 'refresh-hash',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-02T00:00:00.000Z',
};

describe('UsersService', () => {
  let service: UsersService;
  let mockSupabase: ReturnType<typeof createMockSupabaseService>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabaseService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: SupabaseService, useValue: mockSupabase.service },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('getProfile', () => {
    it('returns user with camelCase fields', async () => {
      mockSupabase.mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockDbUser,
        error: null,
      });

      const result = await service.getProfile('user-123');

      expect(mockSupabase.mockClient.from).toHaveBeenCalledWith('users');
      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        timezone: 'UTC',
        emailVerified: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      // Must not include sensitive fields
      expect(result).not.toHaveProperty('password_hash');
      expect(result).not.toHaveProperty('refresh_token_hash');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('refreshTokenHash');
    });
  });

  describe('updateProfile', () => {
    it('update name - changes display name', async () => {
      // First call: no password needed, just update
      mockSupabase.mockQueryBuilder.single.mockResolvedValueOnce({
        data: { ...mockDbUser, display_name: 'New Name' },
        error: null,
      });

      const dto: UpdateProfileDto = { displayName: 'New Name' };
      await service.updateProfile('user-123', dto);

      expect(mockSupabase.mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ display_name: 'New Name' }),
      );
    });

    it('update email - requires current password', async () => {
      const dto: UpdateProfileDto = { email: 'new@example.com' };
      // No currentPassword provided

      await expect(service.updateProfile('user-123', dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateProfile('user-123', dto)).rejects.toThrow(
        'Current password required to change email',
      );
    });

    it('update email - validates current password (wrong password throws 401)', async () => {
      const argon2Module = await import('argon2');
      vi.mocked(argon2Module.verify).mockResolvedValueOnce(false);

      // Must fetch user to verify password
      mockSupabase.mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockDbUser,
        error: null,
      });

      const dto: UpdateProfileDto = {
        email: 'new@example.com',
        currentPassword: 'wrong-password',
      };

      await expect(service.updateProfile('user-123', dto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(
        service.updateProfile('user-123', { ...dto }),
      ).rejects.toThrow('Invalid current password');
    });

    it('update email - succeeds with correct password', async () => {
      const argon2Module = await import('argon2');
      vi.mocked(argon2Module.verify).mockResolvedValueOnce(true);

      // First call: fetch user with password_hash for verification
      mockSupabase.mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockDbUser,
        error: null,
      });
      // Second call: the update + select
      mockSupabase.mockQueryBuilder.single.mockResolvedValueOnce({
        data: { ...mockDbUser, email: 'new@example.com' },
        error: null,
      });

      const dto: UpdateProfileDto = {
        email: 'new@example.com',
        currentPassword: 'correct-password',
      };

      await service.updateProfile('user-123', dto);

      expect(argon2Module.verify).toHaveBeenCalledWith(
        'stored-hash',
        'correct-password',
      );
      expect(mockSupabase.mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com' }),
      );
    });

    it('update password - requires current password and hashes new password', async () => {
      const argon2Module = await import('argon2');
      vi.mocked(argon2Module.verify).mockResolvedValueOnce(true);
      vi.mocked(argon2Module.hash).mockResolvedValueOnce('hashed-new-password');

      mockSupabase.mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockDbUser,
        error: null,
      });
      mockSupabase.mockQueryBuilder.single.mockResolvedValueOnce({
        data: { ...mockDbUser, password_hash: 'hashed-new-password' },
        error: null,
      });

      const dto: UpdateProfileDto = {
        newPassword: 'newpassword123',
        currentPassword: 'current-password',
      };

      await service.updateProfile('user-123', dto);

      expect(argon2Module.hash).toHaveBeenCalledWith('newpassword123');
      expect(mockSupabase.mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          password_hash: 'hashed-new-password',
        }),
      );
    });

    it('update password - invalidates refresh token', async () => {
      const argon2Module = await import('argon2');
      vi.mocked(argon2Module.verify).mockResolvedValueOnce(true);

      mockSupabase.mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockDbUser,
        error: null,
      });
      mockSupabase.mockQueryBuilder.single.mockResolvedValueOnce({
        data: { ...mockDbUser, refresh_token_hash: null },
        error: null,
      });

      const dto: UpdateProfileDto = {
        newPassword: 'newpassword123',
        currentPassword: 'current-password',
      };

      await service.updateProfile('user-123', dto);

      expect(mockSupabase.mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          refresh_token_hash: null,
        }),
      );
    });

    it('update password - requires current password (throws 400 when missing)', async () => {
      const dto: UpdateProfileDto = { newPassword: 'newpassword123' };

      await expect(service.updateProfile('user-123', dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateProfile('user-123', dto)).rejects.toThrow(
        'Current password required to change password',
      );
    });
  });
});
