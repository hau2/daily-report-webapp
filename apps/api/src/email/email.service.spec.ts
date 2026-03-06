import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailService } from './email.service';

const mockEmailsSend = vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null });

vi.mock('resend', () => {
  const MockResend = vi.fn().mockImplementation(() => ({
    emails: {
      send: mockEmailsSend,
    },
  }));
  return { Resend: MockResend };
});

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    mockEmailsSend.mockClear();

    const mockConfigService = {
      get: vi.fn().mockImplementation((key: string) => {
        const config: Record<string, string> = {
          RESEND_API_KEY: 'test-api-key',
          EMAIL_FROM: 'noreply@example.com',
          FRONTEND_URL: 'http://localhost:3000',
        };
        return config[key];
      }),
      getOrThrow: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  describe('sendVerificationEmail', () => {
    it('calls resend.emails.send with correct to, subject, and html containing verification URL', async () => {
      await service.sendVerificationEmail('user@example.com', 'test-token-123');

      expect(mockEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringMatching(/verify/i),
          html: expect.stringContaining('http://localhost:3000/verify-email?token=test-token-123'),
        }),
      );
    });

    it('includes the FROM address from config', async () => {
      await service.sendVerificationEmail('user@example.com', 'test-token-123');

      expect(mockEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@example.com',
        }),
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('calls resend.emails.send with correct to, subject, and html containing reset URL', async () => {
      await service.sendPasswordResetEmail('user@example.com', 'reset-token-456');

      expect(mockEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringMatching(/reset/i),
          html: expect.stringContaining('http://localhost:3000/reset-password?token=reset-token-456'),
        }),
      );
    });

    it('includes the FROM address from config', async () => {
      await service.sendPasswordResetEmail('user@example.com', 'reset-token-456');

      expect(mockEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@example.com',
        }),
      );
    });
  });
});
