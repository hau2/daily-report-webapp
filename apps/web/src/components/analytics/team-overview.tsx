'use client';

import { useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { api } from '@/lib/api-client';
import type {
  AnalyticsRange,
  TeamAnalyticsResponse,
  HeatmapCell,
} from '@daily-report/shared';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { SummaryCard } from './summary-card';
import { ChartCard } from './chart-card';

interface TeamOverviewProps {
  teamId: string;
  range: AnalyticsRange;
  chartRefsCollector?: React.MutableRefObject<HTMLDivElement[]>;
  onDataReady?: (data: TeamAnalyticsResponse) => void;
}

// --- Heatmap helpers ---

interface HeatmapRow {
  userId: string;
  displayName: string;
  cells: Map<string, number>; // date -> hours
}

function buildHeatmapRows(data: HeatmapCell[]): {
  rows: HeatmapRow[];
  dates: string[];
} {
  const rowMap = new Map<string, HeatmapRow>();
  const dateSet = new Set<string>();

  for (const cell of data) {
    dateSet.add(cell.date);
    let row = rowMap.get(cell.userId);
    if (!row) {
      row = { userId: cell.userId, displayName: cell.displayName, cells: new Map() };
      rowMap.set(cell.userId, row);
    }
    row.cells.set(cell.date, cell.hours);
  }

  const dates = Array.from(dateSet).sort();
  const rows = Array.from(rowMap.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );

  return { rows, dates };
}

function heatmapCellColor(hours: number): string {
  if (hours === 0) return 'bg-gray-100 text-gray-400';
  if (hours <= 8) return 'bg-green-200 text-green-800';
  if (hours <= 10) return 'bg-yellow-200 text-yellow-800';
  return 'bg-red-200 text-red-800';
}

function formatShortDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'M/d');
  } catch {
    return dateStr;
  }
}

// --- Main component ---

export function TeamOverview({ teamId, range, chartRefsCollector, onDataReady }: TeamOverviewProps) {
  const chartRef1 = useRef<HTMLDivElement>(null);
  const chartRef2 = useRef<HTMLDivElement>(null);
  const chartRef3 = useRef<HTMLDivElement>(null);
  const chartRef4 = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['team-analytics', teamId, range],
    queryFn: () =>
      api.get<TeamAnalyticsResponse>(
        `/teams/${teamId}/analytics/team?range=${range}`,
      ),
  });

  const heatmap = useMemo(
    () => (data ? buildHeatmapRows(data.heatmap) : { rows: [], dates: [] }),
    [data],
  );

  const sortedTaskVolume = useMemo(
    () =>
      data
        ? [...data.taskVolumeByMember].sort((a, b) => b.taskCount - a.taskCount)
        : [],
    [data],
  );

  useEffect(() => {
    if (chartRefsCollector) {
      chartRefsCollector.current = [chartRef1, chartRef2, chartRef3, chartRef4]
        .map((r) => r.current)
        .filter(Boolean) as HTMLDivElement[];
    }
  }, [chartRefsCollector]);

  useEffect(() => {
    if (data && onDataReady) {
      onDataReady(data);
    }
  }, [data, onDataReady]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="py-8">
                <div className="h-8 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="py-16">
                <div className="h-48 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No report data for this period
      </div>
    );
  }

  const { summary } = data;
  const totalStress =
    summary.stressDistribution.low +
    summary.stressDistribution.medium +
    summary.stressDistribution.high;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Submission Rate"
          value={`${summary.submissionRate.toFixed(0)}%`}
          trend={summary.submissionRateTrend}
          trendLabel="vs prev period"
        />
        <SummaryCard
          title="Avg Hours/Day"
          value={`${summary.avgHoursPerDay.toFixed(1)}h`}
          trend={summary.avgHoursPerDayTrend}
          trendLabel="vs prev period"
        />
        <SummaryCard title="Stress Distribution" value="">
          <div className="flex flex-col gap-1">
            {totalStress > 0 ? (
              <>
                <div className="flex h-3 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-green-400"
                    style={{
                      width: `${(summary.stressDistribution.low / totalStress) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-yellow-400"
                    style={{
                      width: `${(summary.stressDistribution.medium / totalStress) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-red-400"
                    style={{
                      width: `${(summary.stressDistribution.high / totalStress) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="text-green-600">Low {summary.stressDistribution.low}</span>
                  <span className="text-yellow-600">Med {summary.stressDistribution.medium}</span>
                  <span className="text-red-600">High {summary.stressDistribution.high}</span>
                </div>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">No data</span>
            )}
          </div>
        </SummaryCard>
        <SummaryCard
          title="Task Count"
          value={summary.taskCount}
          trend={summary.taskCountTrend}
          trendLabel="vs prev period"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Submission Rate Line Chart */}
        <div ref={chartRef1}>
          <ChartCard title="Submission Rate" filename="submission-rate">
            {data.submissionRates.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No data for this period
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.submissionRates}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    fontSize={12}
                  />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={12} />
                  <Tooltip
                    labelFormatter={(label) => formatShortDate(label as string)}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const entry = payload[0]?.payload as { rate: number; submitted: number; total: number };
                      return (
                        <div className="rounded border bg-white px-3 py-2 text-sm shadow">
                          <p className="font-medium">{formatShortDate(label as string)}</p>
                          <p>{entry.rate.toFixed(0)}% ({entry.submitted}/{entry.total})</p>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Workload Heatmap */}
        <div ref={chartRef2}>
          <ChartCard title="Workload Heatmap" filename="workload-heatmap">
            {heatmap.rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No data for this period
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="sticky left-0 bg-card px-2 py-1 text-left font-medium">
                          Member
                        </th>
                        {heatmap.dates.map((d) => (
                          <th key={d} className="px-2 py-1 text-center font-medium">
                            {formatShortDate(d)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmap.rows.map((row) => (
                        <tr key={row.userId}>
                          <td className="sticky left-0 bg-card px-2 py-1 font-medium whitespace-nowrap">
                            {row.displayName}
                          </td>
                          {heatmap.dates.map((d) => {
                            const hours = row.cells.get(d) ?? 0;
                            return (
                              <td
                                key={d}
                                className={`px-2 py-1 text-center ${heatmapCellColor(hours)}`}
                              >
                                {hours > 0 ? hours.toFixed(1) : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-3 w-3 rounded bg-green-200" /> &le;8h
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-3 w-3 rounded bg-yellow-200" /> 8-10h
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-3 w-3 rounded bg-red-200" /> &gt;10h
                  </span>
                </div>
              </>
            )}
          </ChartCard>
        </div>

        {/* Stress Trend Stacked Area Chart */}
        <div ref={chartRef3}>
          <ChartCard title="Stress Trend" filename="stress-trend">
            {data.stressTrend.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No data for this period
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.stressTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip
                    labelFormatter={(label) => formatShortDate(label as string)}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="low"
                    stackId="stress"
                    stroke="#4ade80"
                    fill="#4ade80"
                    name="Low"
                  />
                  <Area
                    type="monotone"
                    dataKey="medium"
                    stackId="stress"
                    stroke="#facc15"
                    fill="#facc15"
                    name="Medium"
                  />
                  <Area
                    type="monotone"
                    dataKey="high"
                    stackId="stress"
                    stroke="#f87171"
                    fill="#f87171"
                    name="High"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Task Volume by Member */}
        <div ref={chartRef4}>
          <ChartCard title="Task Volume by Member" filename="task-volume">
            {sortedTaskVolume.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No data for this period
              </p>
            ) : (
              <ResponsiveContainer
                width="100%"
                height={Math.max(300, sortedTaskVolume.length * 40)}
              >
                <BarChart data={sortedTaskVolume} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="displayName"
                    width={120}
                    fontSize={12}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const entry = payload[0]?.payload as { displayName: string; taskCount: number };
                      return (
                        <div className="rounded border bg-white px-3 py-2 text-sm shadow">
                          <p className="font-medium">{entry.displayName}</p>
                          <p>{entry.taskCount} tasks</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="taskCount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
