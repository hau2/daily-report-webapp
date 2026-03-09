'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  BarChart,
} from 'recharts';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartCard } from './chart-card';
import type {
  AnalyticsRange,
  MemberAnalyticsResponse,
  TeamReportsResponse,
  SubmissionCalendarDay,
} from '@daily-report/shared';

interface MemberAnalyticsProps {
  teamId: string;
  range: AnalyticsRange;
  chartRefsCollector?: React.MutableRefObject<HTMLDivElement[]>;
  onDataReady?: (data: MemberAnalyticsResponse) => void;
}

const stressToNumber: Record<string, number> = { low: 1, medium: 2, high: 3 };
const stressColor: Record<string, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#ef4444',
};

function StressDot(props: Record<string, unknown>) {
  const { cx, cy, payload } = props as { cx: number; cy: number; payload: { level: string | null } };
  if (!payload.level) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={stressColor[payload.level] ?? '#9ca3af'}
      stroke="none"
    />
  );
}

function SubmissionCalendar({ data }: { data: SubmissionCalendarDay[] }) {
  const grid = useMemo(() => {
    if (!data.length) return { weeks: [], dayLabels: ['M', '', 'W', '', 'F', '', 'S'] };

    const sorted = [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // Group by week columns, rows = day of week (0=Mon..6=Sun)
    const weeks: (SubmissionCalendarDay | null)[][] = [];
    let currentWeek: (SubmissionCalendarDay | null)[] = new Array(7).fill(null);
    let lastWeekStart = -1;

    for (const day of sorted) {
      const d = new Date(day.date + 'T00:00:00');
      // getDay: 0=Sun, convert to 0=Mon
      const dow = (d.getDay() + 6) % 7;
      // Week number relative to first date
      const firstDate = new Date(sorted[0].date + 'T00:00:00');
      const diffDays = Math.floor(
        (d.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const weekIndex = Math.floor((diffDays + ((firstDate.getDay() + 6) % 7)) / 7);

      if (weekIndex !== lastWeekStart) {
        if (lastWeekStart !== -1) {
          weeks.push(currentWeek);
        }
        currentWeek = new Array(7).fill(null);
        lastWeekStart = weekIndex;
      }
      currentWeek[dow] = day;
    }
    weeks.push(currentWeek);

    return { weeks, dayLabels: ['M', '', 'W', '', 'F', '', 'S'] };
  }, [data]);

  if (!data.length) {
    return <p className="text-sm text-muted-foreground">No submission data available.</p>;
  }

  return (
    <div className="flex gap-1">
      {/* Day labels */}
      <div className="flex flex-col gap-[3px] mr-1">
        {grid.dayLabels.map((label, i) => (
          <div
            key={i}
            className="h-[14px] w-[14px] text-[10px] text-muted-foreground flex items-center justify-end pr-0.5"
          >
            {label}
          </div>
        ))}
      </div>
      {/* Week columns */}
      {grid.weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[3px]">
          {week.map((day, di) => (
            <div
              key={di}
              className={`h-[14px] w-[14px] rounded-sm ${
                day === null
                  ? 'bg-transparent'
                  : day.submitted
                    ? 'bg-green-500'
                    : 'bg-gray-200 dark:bg-gray-700'
              }`}
              title={
                day
                  ? `${day.date}: ${day.submitted ? 'Submitted' : 'Missed'}`
                  : undefined
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function MemberAnalytics({ teamId, range, chartRefsCollector, onDataReady }: MemberAnalyticsProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const chartRef1 = useRef<HTMLDivElement>(null);
  const chartRef2 = useRef<HTMLDivElement>(null);
  const chartRef3 = useRef<HTMLDivElement>(null);
  const chartRef4 = useRef<HTMLDivElement>(null);

  // Fetch team members list
  const { data: teamReports, isLoading: isMembersLoading } = useQuery({
    queryKey: ['team-members-list', teamId],
    queryFn: () =>
      api.get<TeamReportsResponse>(
        `/teams/${teamId}/reports?date=${format(new Date(), 'yyyy-MM-dd')}`,
      ),
  });

  const members = teamReports?.members ?? [];

  // Auto-select first member
  const effectiveUserId =
    selectedUserId ??
    (members.length > 0 ? members[0].userId : null);

  // Fetch member analytics
  const {
    data: analytics,
    isLoading: isAnalyticsLoading,
  } = useQuery({
    queryKey: ['member-analytics', teamId, effectiveUserId, range],
    queryFn: () =>
      api.get<MemberAnalyticsResponse>(
        `/teams/${teamId}/analytics/member/${effectiveUserId}?range=${range}`,
      ),
    enabled: !!effectiveUserId,
  });

  // Prepare chart data
  const stressData = useMemo(() => {
    if (!analytics) return [];
    return analytics.stressTimeline
      .filter((d) => d.level !== null)
      .map((d) => ({
        date: format(new Date(d.date + 'T00:00:00'), 'M/d'),
        value: stressToNumber[d.level!],
        level: d.level,
      }));
  }, [analytics]);

  const hoursData = useMemo(() => {
    if (!analytics) return [];
    return analytics.dailyHours.map((d) => ({
      date: format(new Date(d.date + 'T00:00:00'), 'M/d'),
      hours: d.hours,
      teamAvg: d.teamAvg,
    }));
  }, [analytics]);

  const taskData = useMemo(() => {
    if (!analytics) return [];
    return analytics.dailyTasks.map((d) => ({
      date: format(new Date(d.date + 'T00:00:00'), 'M/d'),
      count: d.count,
    }));
  }, [analytics]);

  useEffect(() => {
    if (chartRefsCollector) {
      chartRefsCollector.current = [chartRef1, chartRef2, chartRef3, chartRef4]
        .map((r) => r.current)
        .filter(Boolean) as HTMLDivElement[];
    }
  }, [chartRefsCollector]);

  useEffect(() => {
    if (analytics && onDataReady) {
      onDataReady(analytics);
    }
  }, [analytics, onDataReady]);

  if (isMembersLoading) {
    return <p className="text-muted-foreground py-8 text-center">Loading members...</p>;
  }

  if (members.length === 0) {
    return <p className="text-muted-foreground py-8 text-center">No team members found.</p>;
  }

  const summary = analytics?.summary;

  const stressTrendArrow =
    summary?.stressTrend === -1 ? ' (improving)' :
    summary?.stressTrend === 1 ? ' (worsening)' : ' (stable)';

  const stressBadgeColor =
    summary?.mostCommonStress === 'low'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : summary?.mostCommonStress === 'medium'
        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
        : summary?.mostCommonStress === 'high'
          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          : 'bg-muted text-muted-foreground';

  return (
    <div className="space-y-6">
      {/* Member Selector */}
      <div>
        <label htmlFor="member-select" className="block text-sm font-medium mb-1">
          Select Member
        </label>
        <select
          id="member-select"
          className="border rounded-md px-3 py-2 text-sm w-full max-w-xs bg-background"
          value={effectiveUserId ?? ''}
          onChange={(e) => setSelectedUserId(e.target.value)}
        >
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.displayName || m.email}
            </option>
          ))}
        </select>
      </div>

      {!effectiveUserId && (
        <p className="text-muted-foreground text-center py-8">
          Select a member to view analytics.
        </p>
      )}

      {effectiveUserId && isAnalyticsLoading && (
        <p className="text-muted-foreground text-center py-8">Loading analytics...</p>
      )}

      {analytics && summary && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Submission Streak */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Submission Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary.submissionStreak} days</p>
              </CardContent>
            </Card>

            {/* Avg Hours */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-2xl font-bold ${
                    summary.avgHours > summary.teamAvgHours
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}
                >
                  {summary.avgHours.toFixed(1)}h
                </p>
                <p className="text-xs text-muted-foreground">
                  Team avg: {summary.teamAvgHours.toFixed(1)}h
                </p>
              </CardContent>
            </Card>

            {/* Stress Pattern */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Stress Pattern
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${stressBadgeColor}`}
                >
                  {summary.mostCommonStress
                    ? summary.mostCommonStress.charAt(0).toUpperCase() +
                      summary.mostCommonStress.slice(1)
                    : 'N/A'}
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  Trend: {stressTrendArrow.trim()}
                </p>
              </CardContent>
            </Card>

            {/* Task Output */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Task Output
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {summary.avgTasksPerDay.toFixed(1)}/day
                </p>
                <p className="text-xs text-muted-foreground">
                  Team avg: {summary.teamAvgTasksPerDay.toFixed(1)}/day
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hours Worked */}
            <div ref={chartRef1}>
              <ChartCard title="Hours Worked" filename="hours-worked">
                {hoursData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <ComposedChart data={hoursData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="hours" fill="var(--chart-1)" name="Hours" />
                      <Line
                        dataKey="teamAvg"
                        stroke="var(--chart-3)"
                        strokeDasharray="5 5"
                        name="Team Avg"
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">No hours data available.</p>
                )}
              </ChartCard>
            </div>

            {/* Stress Timeline */}
            <div ref={chartRef2}>
              <ChartCard title="Stress Timeline" filename="stress-timeline">
                {stressData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={stressData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis
                        domain={[0.5, 3.5]}
                        ticks={[1, 2, 3]}
                        tickFormatter={(v: number) =>
                          v === 1 ? 'Low' : v === 2 ? 'Medium' : v === 3 ? 'High' : ''
                        }
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value) => {
                          const v = Number(value);
                          return v === 1 ? 'Low' : v === 2 ? 'Medium' : 'High';
                        }}
                      />
                      <Line
                        dataKey="value"
                        stroke="var(--chart-5)"
                        name="Stress"
                        dot={<StressDot />}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">No stress data available.</p>
                )}
              </ChartCard>
            </div>

            {/* Task Breakdown */}
            <div ref={chartRef3}>
              <ChartCard title="Task Breakdown" filename="task-breakdown">
                {taskData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={taskData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="var(--chart-1)" name="Tasks" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">No task data available.</p>
                )}
              </ChartCard>
            </div>

            {/* Submission Calendar */}
            <div ref={chartRef4}>
              <ChartCard title="Submission Calendar" filename="submission-calendar">
                <SubmissionCalendar data={analytics.submissionCalendar} />
              </ChartCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
