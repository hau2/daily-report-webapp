import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseService } from '../../supabase/supabase.service';
import type { AccessTokenUser } from '../../auth/strategies/access-token.strategy';

@Injectable()
export class TeamManagerGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as AccessTokenUser;
    const teamId = req.params['id'];
    const client = this.supabaseService.getClient();
    const { data } = await client
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.userId)
      .is('left_at', null)
      .single();
    return data?.role === 'owner';
  }
}
