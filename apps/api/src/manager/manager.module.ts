import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';
import { TeamManagerGuard } from '../teams/guards/team-manager.guard';

@Module({
  imports: [SupabaseModule],
  controllers: [ManagerController],
  providers: [ManagerService, TeamManagerGuard],
})
export class ManagerModule {}
