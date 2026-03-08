import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { TeamManagerGuard } from '../teams/guards/team-manager.guard';

@Module({
  imports: [SupabaseModule],
  controllers: [ManagerController, AnalyticsController],
  providers: [ManagerService, AnalyticsService, TeamManagerGuard],
})
export class ManagerModule {}
