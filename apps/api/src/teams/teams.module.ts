import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EmailModule } from '../email/email.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { TeamManagerGuard } from './guards/team-manager.guard';

@Module({
  imports: [JwtModule.register({}), SupabaseModule, EmailModule],
  controllers: [TeamsController],
  providers: [TeamsService, TeamManagerGuard],
})
export class TeamsModule {}
