import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import type { User } from '@daily-report/shared';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

interface DbUserRow {
  id: string;
  email: string;
  display_name: string | null;
  timezone: string;
  email_verified: boolean;
  password_hash: string;
  refresh_token_hash: string | null;
  created_at: string;
  updated_at: string;
}

function mapDbUserToUser(row: DbUserRow): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    timezone: row.timezone,
    emailVerified: row.email_verified,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getProfile(userId: string): Promise<User> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('users')
      .select('id, email, display_name, timezone, email_verified, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundException('User not found');
      throw new Error(`Database error: ${error.message}`);
    }

    return mapDbUserToUser(data as DbUserRow);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const client = this.supabaseService.getClient();

    // Validate: email or password change requires currentPassword
    if (dto.email && !dto.currentPassword) {
      throw new BadRequestException('Current password required to change email');
    }
    if (dto.newPassword && !dto.currentPassword) {
      throw new BadRequestException('Current password required to change password');
    }

    // If currentPassword provided, verify it
    if (dto.currentPassword) {
      const { data: userRow } = await client
        .from('users')
        .select('password_hash')
        .eq('id', userId)
        .single();

      const row = userRow as { password_hash: string } | null;
      if (!row) {
        throw new UnauthorizedException('Invalid current password');
      }

      const valid = await argon2.verify(row.password_hash, dto.currentPassword);
      if (!valid) {
        throw new UnauthorizedException('Invalid current password');
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {};

    if (dto.displayName !== undefined) {
      updates.display_name = dto.displayName;
    }
    if (dto.email !== undefined) {
      updates.email = dto.email;
    }
    if (dto.timezone !== undefined) {
      updates.timezone = dto.timezone;
    }
    if (dto.newPassword !== undefined) {
      updates.password_hash = await argon2.hash(dto.newPassword);
      updates.refresh_token_hash = null;
    }

    const { data, error } = await client
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('id, email, display_name, timezone, email_verified, created_at, updated_at')
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return mapDbUserToUser(data as DbUserRow);
  }
}
