import type {
  TeamAnalyticsResponse,
  MemberAnalyticsResponse,
} from '@daily-report/shared';

export function escapeCsvField(value: string | number): string {
  if (typeof value === 'number') return String(value);
  return `"${value.replace(/"/g, '""')}"`;
}

export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function teamAnalyticsToCsv(data: TeamAnalyticsResponse): string {
  const lines: string[] = [];

  // Section 1: Submission Rates
  lines.push('Submission Rates');
  lines.push('Date,Rate (%),Submitted,Total');
  for (const entry of data.submissionRates) {
    lines.push(
      `${escapeCsvField(entry.date)},${entry.rate},${entry.submitted},${entry.total}`,
    );
  }

  // Section 2: Stress Trend
  lines.push('');
  lines.push('Stress Trend');
  lines.push('Date,Low,Medium,High');
  for (const entry of data.stressTrend) {
    lines.push(
      `${escapeCsvField(entry.date)},${entry.low},${entry.medium},${entry.high}`,
    );
  }

  // Section 3: Task Volume by Member
  lines.push('');
  lines.push('Task Volume by Member');
  lines.push('Member,Task Count');
  for (const entry of data.taskVolumeByMember) {
    lines.push(`${escapeCsvField(entry.displayName)},${entry.taskCount}`);
  }

  // Section 4: Workload Heatmap
  lines.push('');
  lines.push('Workload Heatmap');
  lines.push('UserId,Member,Date,Hours');
  for (const entry of data.heatmap) {
    lines.push(
      `${escapeCsvField(entry.userId)},${escapeCsvField(entry.displayName)},${escapeCsvField(entry.date)},${entry.hours}`,
    );
  }

  return lines.join('\n');
}

export function memberAnalyticsToCsv(data: MemberAnalyticsResponse): string {
  const lines: string[] = [];

  // Section 1: Daily Hours
  lines.push('Daily Hours');
  lines.push('Date,Hours,Team Avg');
  for (const entry of data.dailyHours) {
    lines.push(
      `${escapeCsvField(entry.date)},${entry.hours},${entry.teamAvg}`,
    );
  }

  // Section 2: Stress Timeline
  lines.push('');
  lines.push('Stress Timeline');
  lines.push('Date,Level');
  for (const entry of data.stressTimeline) {
    lines.push(
      `${escapeCsvField(entry.date)},${escapeCsvField(entry.level ?? 'N/A')}`,
    );
  }

  // Section 3: Daily Tasks
  lines.push('');
  lines.push('Daily Tasks');
  lines.push('Date,Count');
  for (const entry of data.dailyTasks) {
    lines.push(`${escapeCsvField(entry.date)},${entry.count}`);
  }

  // Section 4: Submission Calendar
  lines.push('');
  lines.push('Submission Calendar');
  lines.push('Date,Submitted');
  for (const entry of data.submissionCalendar) {
    lines.push(
      `${escapeCsvField(entry.date)},${entry.submitted ? 'yes' : 'no'}`,
    );
  }

  return lines.join('\n');
}
