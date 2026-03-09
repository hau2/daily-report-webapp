'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, addDays, subDays, isToday, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Download, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import type {
  TeamMemberReport,
  PendingMember,
  TeamReportsResponse,
  Team,
  StressLevel,
} from '@daily-report/shared';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ---- Types ----

interface TeamWithRole {
  team: Team;
  role: 'owner' | 'member';
}

// ---- Status Badge ----

function StatusBadge({ status }: { status: 'submitted' | 'draft' | 'none' }) {
  switch (status) {
    case 'submitted':
      return <Badge className="bg-green-600">Submitted</Badge>;
    case 'draft':
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          Draft
        </Badge>
      );
    case 'none':
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          No Report
        </Badge>
      );
  }
}

// ---- Stress Level Badge ----

function StressLevelBadge({ stressLevel }: { stressLevel: StressLevel | null }) {
  if (!stressLevel) return null;

  const config: Record<StressLevel, { className: string; label: string }> = {
    low: { className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Low' },
    medium: { className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Medium' },
    high: { className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'High' },
  };

  const { className, label } = config[stressLevel];

  return (
    <Badge variant="secondary" className={className}>
      {label}
    </Badge>
  );
}

// ---- Member Report Card ----

function MemberReportCard({ member }: { member: TeamMemberReport }) {
  const [expanded, setExpanded] = useState(false);
  const displayName = member.displayName || member.email;

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-medium">
              {displayName}
            </CardTitle>
            <StatusBadge status={member.status} />
            {member.status === 'submitted' && member.stressLevel && (
              <StressLevelBadge stressLevel={member.stressLevel} />
            )}
            {member.departed && (
              <Badge variant="outline" className="border-border text-muted-foreground">
                Departed
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{member.totalHours}h total</span>
            <span className="text-xs">
              {expanded ? '▲' : '▼'}
            </span>
          </div>
        </div>
        {member.displayName && (
          <p className="text-sm text-muted-foreground">{member.email}</p>
        )}
      </CardHeader>

      {expanded && (
        <CardContent>
          {member.tasks.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              No tasks logged.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium">Task</th>
                    <th className="pb-2 pr-4 font-medium">Hours</th>
                    <th className="pb-2 pr-4 font-medium">Source</th>
                    <th className="pb-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {member.tasks.map((task) => (
                    <tr key={task.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{task.title}</td>
                      <td className="py-2 pr-4">{task.estimatedHours}h</td>
                      <td className="py-2 pr-4">
                        {task.sourceLink ? (
                          <a
                            href={task.sourceLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block max-w-[200px] truncate text-blue-600 underline hover:text-blue-800"
                          >
                            {task.sourceLink}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-2">
                        {task.notes || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ---- Pending Members Panel ----

function PendingPanel({ pending }: { pending: PendingMember[] }) {
  if (pending.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
        <CardHeader>
          <CardTitle className="text-base font-medium text-green-800 dark:text-green-400">
            All members submitted
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-medium text-amber-800 dark:text-amber-400">
            Pending Submissions
          </CardTitle>
          <Badge variant="secondary" className="bg-amber-200 text-amber-900 dark:bg-amber-900/30 dark:text-amber-400">
            {pending.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {pending.map((member) => (
            <li
              key={member.userId}
              className="flex items-center justify-between text-sm"
            >
              <span className="font-medium text-amber-900 dark:text-amber-400">
                {member.displayName || member.email}
              </span>
              <Badge
                variant="outline"
                className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"
              >
                {member.reportStatus === 'draft' ? 'Draft' : 'Not started'}
              </Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ---- Main Page ----

export default function ManagerTeamDashboard() {
  const params = useParams<{ teamId: string }>();
  const teamId = params.teamId;

  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const parsedDate = parseISO(date);
  const isViewingToday = isToday(parsedDate);
  const formattedDate = format(parsedDate, 'EEEE, MMMM d, yyyy');

  // Fetch team info for name
  const { data: teams } = useQuery({
    queryKey: ['teams', 'my'],
    queryFn: () => api.get<TeamWithRole[]>('/teams/my'),
    staleTime: 5 * 60 * 1000,
  });

  const currentTeam = teams?.find((t) => t.team.id === teamId);
  const teamName = currentTeam?.team.name ?? 'Team';

  // Fetch team reports
  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['team-reports', teamId, date],
    queryFn: () =>
      api.get<TeamReportsResponse>(
        `/teams/${teamId}/reports?date=${date}`,
      ),
  });

  // Fetch pending members
  const { data: pending, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending', teamId, date],
    queryFn: () =>
      api.get<PendingMember[]>(
        `/teams/${teamId}/reports/pending?date=${date}`,
      ),
  });

  // Date navigation
  function goToPreviousDay() {
    setDate(format(subDays(parsedDate, 1), 'yyyy-MM-dd'));
  }

  function goToNextDay() {
    setDate(format(addDays(parsedDate, 1), 'yyyy-MM-dd'));
  }

  function goToToday() {
    setDate(format(new Date(), 'yyyy-MM-dd'));
  }

  // Export CSV
  async function handleExport() {
    const API_URL =
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    try {
      const res = await fetch(
        `${API_URL}/teams/${teamId}/reports/export?date=${date}`,
        {
          credentials: 'include',
        },
      );
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `team-report-${date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report exported');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    }
  }

  const members = reportsData?.members ?? [];
  const pendingMembers = pending ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{teamName}</h1>
          <p className="mt-1 text-muted-foreground">
            <span
              className={isViewingToday ? 'font-semibold text-foreground' : ''}
            >
              {formattedDate}
            </span>
            {isViewingToday && (
              <Badge variant="secondary" className="ml-2">
                Today
              </Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Prev</span>
          </Button>
          {!isViewingToday && (
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={goToNextDay}>
            <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Link href={`/manager/${teamId}/analytics`}>
            <Button variant="outline" size="sm">
              <BarChart3 className="mr-1 h-4 w-4" />
              Analytics
            </Button>
          </Link>
          <Button size="sm" onClick={handleExport}>
            <Download className="mr-1 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Pending panel - sidebar on desktop, top on mobile */}
        <div className="lg:col-span-1">
          {pendingLoading ? (
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">
                  Loading pending...
                </p>
              </CardContent>
            </Card>
          ) : (
            <PendingPanel pending={pendingMembers} />
          )}
        </div>

        {/* Member reports */}
        <div className="space-y-4 lg:col-span-2">
          {reportsLoading ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Loading reports...</p>
              </CardContent>
            </Card>
          ) : members.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  No team members found.
                </p>
              </CardContent>
            </Card>
          ) : (
            members.map((member) => (
              <MemberReportCard key={member.userId} member={member} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
