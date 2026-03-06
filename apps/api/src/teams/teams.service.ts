import * as crypto from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../supabase/supabase.service';
import { EmailService } from '../email/email.service';
import type { AccessTokenUser } from '../auth/strategies/access-token.strategy';
import type { CreateTeamDto } from './dto/create-team.dto';
import type { InviteMemberDto } from './dto/invite-member.dto';

interface TeamInvitationPayload {
  sub: string;
  purpose: string;
  teamId: string;
  inviteeEmail: string;
}

@Injectable()
export class TeamsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async createTeam(
    userId: string,
    dto: CreateTeamDto,
  ): Promise<{ id: string; name: string; created_by: string; created_at: string; updated_at: string }> {
    const client = this.supabaseService.getClient();

    const { data: team, error: teamError } = await client
      .from('teams')
      .insert({ name: dto.name, created_by: userId })
      .select()
      .single();

    if (teamError) {
      throw new Error(`Database error: ${teamError.message}`);
    }

    const { error: memberError } = await client
      .from('team_members')
      .insert({ team_id: team.id, user_id: userId, role: 'manager' })
      .select()
      .single();

    if (memberError) {
      throw new Error(`Database error: ${memberError.message}`);
    }

    return team;
  }

  async getMyTeams(
    userId: string,
  ): Promise<Array<{ team: Record<string, unknown>; role: string }>> {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('team_members')
      .select('role, teams(id, name, created_by, created_at, updated_at)')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return (data ?? []).map((row: { role: string; teams: Record<string, unknown> }) => ({
      team: row.teams,
      role: row.role,
    }));
  }

  async inviteMember(
    teamId: string,
    invitingUserId: string,
    dto: InviteMemberDto,
  ): Promise<void> {
    const client = this.supabaseService.getClient();

    // Verify caller is a manager of this team
    const { data: membership } = await client
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', invitingUserId)
      .single();

    if (membership?.role !== 'manager') {
      throw new ForbiddenException('Only team managers can invite members');
    }

    // Get team info for the email
    const { data: team } = await client
      .from('teams')
      .select('name, created_by')
      .eq('id', teamId)
      .single();

    // Get inviter info for the email (use userId as display name fallback)
    const { data: inviter } = await client
      .from('users')
      .select('display_name, email')
      .eq('id', invitingUserId)
      .single();

    const inviterName: string =
      (inviter as { display_name?: string; email?: string } | null)?.display_name ??
      (inviter as { display_name?: string; email?: string } | null)?.email ??
      'A team manager';
    const teamName: string = (team as { name?: string } | null)?.name ?? 'a team';

    const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');

    // Sign the invitation token
    const token = await this.jwtService.signAsync(
      {
        sub: invitingUserId,
        purpose: 'team-invitation',
        teamId,
        inviteeEmail: dto.email,
      },
      { secret: jwtSecret, expiresIn: '7d' },
    );

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Mark any existing pending invitation as used (re-invite case)
    await client
      .from('team_invitations')
      .update({ used_at: new Date().toISOString() })
      .eq('team_id', teamId)
      .eq('invitee_email', dto.email)
      .is('used_at', null);

    // Insert new invitation row
    await client.from('team_invitations').insert({
      team_id: teamId,
      invited_by: invitingUserId,
      invitee_email: dto.email,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    await this.emailService.sendTeamInvitationEmail(dto.email, inviterName, teamName, token);
  }

  async acceptInvitation(
    token: string,
    currentUser: AccessTokenUser,
  ): Promise<{ teamId: string }> {
    const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    const client = this.supabaseService.getClient();

    let payload: TeamInvitationPayload;
    try {
      payload = await this.jwtService.verifyAsync<TeamInvitationPayload>(token, {
        secret: jwtSecret,
      });
    } catch {
      throw new BadRequestException('Invalid or expired invitation link');
    }

    if (payload.purpose !== 'team-invitation') {
      throw new BadRequestException('Invalid or expired invitation link');
    }

    if (payload.inviteeEmail !== currentUser.email) {
      throw new ForbiddenException('Invitation is for a different email address');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { data: invitation } = await client
      .from('team_invitations')
      .select('*')
      .eq('token_hash', tokenHash)
      .single();

    if (!invitation || (invitation as { used_at: string | null }).used_at !== null) {
      throw new BadRequestException('Invitation already used or not found');
    }

    try {
      await client
        .from('team_members')
        .insert({ team_id: payload.teamId, user_id: currentUser.userId, role: 'member' });
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === '23505'
      ) {
        throw new ConflictException('Already a member of this team');
      }
      throw err;
    }

    await client
      .from('team_invitations')
      .update({ used_at: new Date().toISOString() })
      .eq('id', (invitation as { id: string }).id);

    return { teamId: payload.teamId };
  }
}
