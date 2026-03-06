import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly emailFrom: string;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.emailFrom = this.configService.get<string>('EMAIL_FROM') ?? 'noreply@example.com';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.resend = null;
      this.logger.warn('RESEND_API_KEY not set. Emails will be logged to console only.');
    }
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${token}`;

    if (!this.resend) {
      this.logger.log(`[DEV] Verification URL for ${to}: ${verificationUrl}`);
      return;
    }

    await this.resend.emails.send({
      from: this.emailFrom,
      to,
      subject: 'Verify your email address',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Verify your email address</h2>
          <p>Thank you for registering. Please click the link below to verify your email address:</p>
          <p>
            <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 6px;">
              Verify Email
            </a>
          </p>
          <p>Or copy and paste this URL into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you did not create an account, you can safely ignore this email.</p>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

    if (!this.resend) {
      this.logger.log(`[DEV] Password reset URL for ${to}: ${resetUrl}`);
      return;
    }

    await this.resend.emails.send({
      from: this.emailFrom,
      to,
      subject: 'Reset your password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Reset your password</h2>
          <p>You requested a password reset. Click the link below to set a new password:</p>
          <p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 6px;">
              Reset Password
            </a>
          </p>
          <p>Or copy and paste this URL into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
        </div>
      `,
    });
  }
}
