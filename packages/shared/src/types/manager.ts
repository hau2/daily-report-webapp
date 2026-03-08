import type { DailyReport, Task, StressLevel } from './task';

export interface TeamMemberReport {
  userId: string;
  email: string;
  displayName: string;
  status: 'draft' | 'submitted' | 'none';
  report: DailyReport | null;
  tasks: Task[];
  totalHours: number;
  stressLevel: StressLevel | null;
  departed?: boolean;
}

export interface PendingMember {
  userId: string;
  email: string;
  displayName: string;
  reportStatus: 'draft' | 'none';
}

export interface TeamReportsResponse {
  date: string;
  teamId: string;
  members: TeamMemberReport[];
}
