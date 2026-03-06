import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { Response } from 'express';
import { EmailService } from '../email/email.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const passwordHash = await argon2.hash(dto.password);

    const client = this.supabaseService.getClient();
    const { data: user, error } = await client
      .from('users')
      .insert({
        email: dto.email,
        password_hash: passwordHash,
        display_name: dto.displayName ?? null,
        timezone: 'UTC',
        email_verified: false,
        refresh_token_hash: null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException('Email already registered');
      }
      throw new Error(`Database error: ${error.message}`);
    }

    if (user) {
      const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
      const verificationToken = await this.jwtService.signAsync(
        { sub: user.id, purpose: 'email-verification' },
        { secret: jwtSecret, expiresIn: '1h' },
      );
      await this.emailService.sendVerificationEmail(user.email, verificationToken);
    }

    return { message: 'Registration successful' };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> {
    const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');

    let payload: { sub: string; purpose: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.token, { secret: jwtSecret });
    } catch {
      throw new BadRequestException('Invalid or expired verification link');
    }

    if (payload.purpose !== 'email-verification') {
      throw new BadRequestException('Invalid or expired verification link');
    }

    const client = this.supabaseService.getClient();
    await client
      .from('users')
      .update({ email_verified: true })
      .eq('id', payload.sub);

    return { message: 'Email verified successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const client = this.supabaseService.getClient();
    const { data: user } = await client
      .from('users')
      .select('*')
      .eq('email', dto.email)
      .single();

    if (user) {
      const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
      const resetToken = await this.jwtService.signAsync(
        { sub: user.id, purpose: 'password-reset' },
        { secret: jwtSecret, expiresIn: '1h' },
      );
      await this.emailService.sendPasswordResetEmail(user.email, resetToken);
    }

    return { message: "If an account exists, a reset link has been sent" };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');

    let payload: { sub: string; purpose: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.token, { secret: jwtSecret });
    } catch {
      throw new BadRequestException('Invalid or expired reset link');
    }

    if (payload.purpose !== 'password-reset') {
      throw new BadRequestException('Invalid or expired reset link');
    }

    const newPasswordHash = await argon2.hash(dto.password);

    const client = this.supabaseService.getClient();
    await client
      .from('users')
      .update({ password_hash: newPasswordHash, refresh_token_hash: null })
      .eq('id', payload.sub);

    return { message: 'Password reset successfully' };
  }

  async login(dto: LoginDto, res: Response): Promise<{ message: string }> {
    const client = this.supabaseService.getClient();
    const { data: user } = await client
      .from('users')
      .select('*')
      .eq('email', dto.email)
      .single();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await argon2.verify(user.password_hash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.generateTokensAndSetCookies(user.id, user.email, res);

    return { message: 'Login successful' };
  }

  async refresh(
    userId: string,
    refreshToken: string,
    res: Response,
  ): Promise<{ message: string }> {
    const client = this.supabaseService.getClient();
    const { data: user } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!user || !user.refresh_token_hash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenValid = await argon2.verify(user.refresh_token_hash, refreshToken);
    if (!tokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.generateTokensAndSetCookies(user.id, user.email, res);

    return { message: 'Token refreshed' };
  }

  async logout(userId: string, res: Response): Promise<{ message: string }> {
    const client = this.supabaseService.getClient();
    await client
      .from('users')
      .update({ refresh_token_hash: null })
      .eq('id', userId);

    const isProduction = this.configService.get('NODE_ENV') === 'production';

    res.cookie('access_token', '', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    res.cookie('refresh_token', '', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/auth/refresh',
      maxAge: 0,
    });

    return { message: 'Logged out' };
  }

  private async generateTokensAndSetCookies(
    userId: string,
    email: string,
    res: Response,
  ): Promise<void> {
    const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email },
        { secret: jwtSecret, expiresIn: '15m' },
      ),
      this.jwtService.signAsync(
        { sub: userId, email },
        { secret: jwtSecret, expiresIn: '7d' },
      ),
    ]);

    const refreshTokenHash = await argon2.hash(refreshToken);

    const client = this.supabaseService.getClient();
    await client
      .from('users')
      .update({ refresh_token_hash: refreshTokenHash })
      .eq('id', userId);

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
