import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { Response } from 'express';
import { SupabaseService } from '../supabase/supabase.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const passwordHash = await argon2.hash(dto.password);

    const client = this.supabaseService.getClient();
    const { error } = await client
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

    return { message: 'Registration successful' };
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
