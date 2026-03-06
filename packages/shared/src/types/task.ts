export interface Task {
  id: string;
  reportId: string;
  title: string;
  estimatedHours: number;
  sourceLink: string | null;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailyReport {
  id: string;
  userId: string;
  teamId: string;
  reportDate: string; // YYYY-MM-DD
  status: 'draft' | 'submitted';
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyReportWithTasks {
  report: DailyReport;
  tasks: Task[];
  totalHours: number;
}
