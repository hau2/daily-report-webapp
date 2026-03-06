import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockSupabaseService } from '../../test/setup';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from './auth.service';

// Mock argon2 at module level to avoid ESM spy restrictions
vi.mock('argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed-value'),
  verify: vi.fn().mockResolvedValue(true),
}));

describe('AuthService', () => {
  let service: AuthService;
  let mockSupabase: ReturnType<typeof createMockSupabaseService>;
  let mockJwtService: { signAsync: ReturnType<typeof vi.fn> };
  let mockConfigService: { getOrThrow: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockRes: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabaseService();

    mockJwtService = {
      signAsync: vi.fn().mockResolvedValue('mock-jwt-token'),
    };

    mockConfigService = {
      getOrThrow: vi.fn().mockReturnValue('test-secret'),
      get: vi.fn().mockReturnValue(undefined), // Not production
    };

    mockRes = {
      cookie: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: mockSupabase.service },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('creates user with hashed password', async () => {
      const argon2Module = await import('argon2');
      mockSupabase.mockQueryBuilder.single.mockResolvedValueOnce({
        data: { id: 'user-123', email: 'test@example.com' },
        error: null,
      });

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
      });

      expect(argon2Module.hash).toHaveBeenCalledWith('password123');
      expect(mockSupabase.mockClient.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          password_hash: 'hashed-value',
          display_name: 'Test User',
        }),
      );
      expect(result).toEqual({ message: 'Registration successful' });
    });

    it('rejects duplicate email with 409 ConflictException', async () => {
      mockSupabase.mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      });

      await expect(
        service.register({ email: 'existing@example.com', password: 'password123' }),
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('returns success message with valid credentials and sets cookies', async () => {
      const argon2Module = await import('argon2');
      vi.mocked(argon2Module.verify).mockResolvedValueOnce(true);

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
      };

      // First call: find user by email
      mockSupabase.mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

      const result = await service.login(
        { email: 'test@example.com', password: 'password123' },
        mockRes,
      );

      expect(argon2Module.verify).toHaveBeenCalledWith('hashed-password', 'password123');
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: 'user-123', email: 'test@example.com' },
        { secret: 'test-secret', expiresIn: '15m' },
      );
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: 'user-123', email: 'test@example.com' },
        { secret: 'test-secret', expiresIn: '7d' },
      );
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'access_token',
        'mock-jwt-token',
        expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
      );
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'mock-jwt-token',
        expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/auth/refresh' }),
      );
      expect(result).toEqual({ message: 'Login successful' });
    });

    it('rejects with 401 when user not found', async () => {
      mockSupabase.mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(
        service.login(
          { email: 'nonexistent@example.com', password: 'password123' },
          mockRes,
        ),
      ).rejects.toThrow('Invalid credentials');
    });

    it('rejects with 401 when password is wrong', async () => {
      const argon2Module = await import('argon2');
      vi.mocked(argon2Module.verify).mockResolvedValueOnce(false);

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
      };

      mockSupabase.mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

      await expect(
        service.login(
          { email: 'test@example.com', password: 'wrongpassword' },
          mockRes,
        ),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refresh', () => {
    it('validates refresh token hash and reissues both tokens', async () => {
      const argon2Module = await import('argon2');
      vi.mocked(argon2Module.verify).mockResolvedValueOnce(true);

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        refresh_token_hash: 'stored-hash',
      };

      mockSupabase.mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

      const result = await service.refresh(
        'user-123',
        'raw-refresh-token',
        mockRes,
      );

      expect(argon2Module.verify).toHaveBeenCalledWith('stored-hash', 'raw-refresh-token');
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ message: 'Token refreshed' });
    });

    it('rejects with 401 when refresh token hash mismatch', async () => {
      const argon2Module = await import('argon2');
      vi.mocked(argon2Module.verify).mockResolvedValueOnce(false);

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        refresh_token_hash: 'stored-hash',
      };

      mockSupabase.mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

      await expect(
        service.refresh('user-123', 'tampered-token', mockRes),
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    it('clears cookies and nullifies refresh_token_hash', async () => {
      const result = await service.logout('user-123', mockRes);

      expect(mockSupabase.mockClient.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.mockQueryBuilder.update).toHaveBeenCalledWith({
        refresh_token_hash: null,
      });
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'access_token',
        '',
        expect.objectContaining({ maxAge: 0, path: '/' }),
      );
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refresh_token',
        '',
        expect.objectContaining({ maxAge: 0, path: '/auth/refresh' }),
      );
      expect(result).toEqual({ message: 'Logged out' });
    });
  });
});
