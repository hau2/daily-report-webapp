import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockSupabaseService } from '../../test/setup';
import { EmailService } from '../email/email.service';
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
  let mockJwtService: { signAsync: ReturnType<typeof vi.fn>; verifyAsync: ReturnType<typeof vi.fn> };
  let mockConfigService: { getOrThrow: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
  let mockEmailService: { sendVerificationEmail: ReturnType<typeof vi.fn>; sendPasswordResetEmail: ReturnType<typeof vi.fn> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockRes: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabaseService();

    mockJwtService = {
      signAsync: vi.fn().mockResolvedValue('mock-jwt-token'),
      verifyAsync: vi.fn().mockResolvedValue({ sub: 'user-123', purpose: 'email-verification' }),
    };

    mockConfigService = {
      getOrThrow: vi.fn().mockReturnValue('test-secret'),
      get: vi.fn().mockReturnValue(undefined), // Not production
    };

    mockEmailService = {
      sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
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
        { provide: EmailService, useValue: mockEmailService },
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

  describe('register (with email verification)', () => {
    it('sends verification email after successful registration', async () => {
      mockSupabase.mockQueryBuilder.single.mockResolvedValueOnce({
        data: { id: 'user-123', email: 'test@example.com' },
        error: null,
      });

      await service.register({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
      });

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: 'user-123', purpose: 'email-verification' },
        { secret: 'test-secret', expiresIn: '1h' },
      );
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        'mock-jwt-token',
      );
    });
  });

  describe('verifyEmail', () => {
    it('marks user as verified with valid email-verification token', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        sub: 'user-123',
        purpose: 'email-verification',
      });

      const result = await service.verifyEmail({ token: 'valid-token' });

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });
      expect(mockSupabase.mockQueryBuilder.update).toHaveBeenCalledWith({
        email_verified: true,
      });
      expect(result).toEqual({ message: 'Email verified successfully' });
    });

    it('throws BadRequestException with expired/invalid token', async () => {
      mockJwtService.verifyAsync.mockRejectedValueOnce(new Error('jwt expired'));

      await expect(service.verifyEmail({ token: 'expired-token' })).rejects.toThrow(
        'Invalid or expired verification link',
      );
    });

    it('throws BadRequestException when token purpose is wrong', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        sub: 'user-123',
        purpose: 'password-reset', // Wrong purpose
      });

      await expect(service.verifyEmail({ token: 'wrong-purpose-token' })).rejects.toThrow(
        'Invalid or expired verification link',
      );
    });
  });

  describe('forgotPassword', () => {
    it('sends password reset email when user exists', async () => {
      mockSupabase.mockQueryBuilder.single.mockResolvedValueOnce({
        data: { id: 'user-123', email: 'user@example.com' },
        error: null,
      });

      const result = await service.forgotPassword({ email: 'user@example.com' });

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: 'user-123', purpose: 'password-reset' },
        { secret: 'test-secret', expiresIn: '1h' },
      );
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'user@example.com',
        'mock-jwt-token',
      );
      expect(result).toEqual({ message: "If an account exists, a reset link has been sent" });
    });

    it('returns success even when email not found (no enumeration leak)', async () => {
      mockSupabase.mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await service.forgotPassword({ email: 'nonexistent@example.com' });

      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(result).toEqual({ message: "If an account exists, a reset link has been sent" });
    });
  });

  describe('resetPassword', () => {
    it('validates token, updates password hash, and nullifies refresh token', async () => {
      const argon2Module = await import('argon2');
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        sub: 'user-123',
        purpose: 'password-reset',
      });

      const result = await service.resetPassword({ token: 'valid-reset-token', password: 'newpassword123' });

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid-reset-token', {
        secret: 'test-secret',
      });
      expect(argon2Module.hash).toHaveBeenCalledWith('newpassword123');
      expect(mockSupabase.mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          password_hash: 'hashed-value',
          refresh_token_hash: null,
        }),
      );
      expect(result).toEqual({ message: 'Password reset successfully' });
    });

    it('throws BadRequestException with expired/invalid reset token', async () => {
      mockJwtService.verifyAsync.mockRejectedValueOnce(new Error('jwt expired'));

      await expect(service.resetPassword({ token: 'expired-token', password: 'newpassword123' })).rejects.toThrow(
        'Invalid or expired reset link',
      );
    });

    it('throws BadRequestException when reset token has wrong purpose', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        sub: 'user-123',
        purpose: 'email-verification', // Wrong purpose
      });

      await expect(service.resetPassword({ token: 'wrong-purpose', password: 'newpassword123' })).rejects.toThrow(
        'Invalid or expired reset link',
      );
    });
  });
});
