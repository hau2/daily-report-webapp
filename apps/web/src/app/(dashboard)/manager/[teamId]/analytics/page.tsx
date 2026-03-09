'use client';

import { useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { Team, AnalyticsRange, TeamAnalyticsResponse, MemberAnalyticsResponse } from '@daily-report/shared';
import { Button } from '@/components/ui/button';
import { TeamOverview } from '@/components/analytics/team-overview';
import { MemberAnalytics } from '@/components/analytics/member-analytics';
import { ExportToolbar } from '@/components/analytics/export-toolbar';
import { downloadCsv, teamAnalyticsToCsv, memberAnalyticsToCsv } from '@/lib/export-csv';

interface TeamWithRole {
  team: Team;
  role: 'owner' | 'member';
}

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
];

const TABS = [
  { value: 'team' as const, label: 'Team Overview' },
  { value: 'member' as const, label: 'Individual Member' },
];

export default function AnalyticsPage() {
  const params = useParams<{ teamId: string }>();
  const teamId = params.teamId;

  const [activeTab, setActiveTab] = useState<'team' | 'member'>('team');
  const [range, setRange] = useState<AnalyticsRange>('week');

  const teamChartRefs = useRef<HTMLDivElement[]>([]);
  const memberChartRefs = useRef<HTMLDivElement[]>([]);
  const [teamData, setTeamData] = useState<TeamAnalyticsResponse | null>(null);
  const [memberData, setMemberData] = useState<MemberAnalyticsResponse | null>(null);

  // Fetch team name
  const { data: teams } = useQuery({
    queryKey: ['teams', 'my'],
    queryFn: () => api.get<TeamWithRole[]>('/teams/my'),
    staleTime: 5 * 60 * 1000,
  });

  const currentTeam = teams?.find((t) => t.team.id === teamId);
  const teamName = currentTeam?.team.name ?? 'Team';

  const getChartElements = useCallback(() => {
    return activeTab === 'team' ? teamChartRefs.current : memberChartRefs.current;
  }, [activeTab]);

  const handleExportCsv = useCallback(() => {
    if (activeTab === 'team' && teamData) {
      downloadCsv(teamAnalyticsToCsv(teamData), `${teamName}-team-analytics-${range}.csv`);
    } else if (activeTab === 'member' && memberData) {
      const memberName = memberData.displayName || 'member';
      downloadCsv(memberAnalyticsToCsv(memberData), `${memberName}-analytics-${range}.csv`);
    }
  }, [activeTab, teamData, memberData, teamName, range]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/manager/${teamId}`}>
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{teamName} Analytics</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Time range toggle */}
          <div className="flex items-center gap-1 rounded-md border p-1">
            {RANGES.map((r) => (
              <Button
                key={r.value}
                variant={range === r.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setRange(r.value)}
              >
                {r.label}
              </Button>
            ))}
          </div>

          <ExportToolbar
            getChartElements={getChartElements}
            teamName={teamName}
            range={range}
            onExportCsv={handleExportCsv}
          />
        </div>
      </div>

      {/* Tab toggle */}
      <div className="mb-6 flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'team' ? (
        <TeamOverview
          teamId={teamId}
          range={range}
          chartRefsCollector={teamChartRefs}
          onDataReady={setTeamData}
        />
      ) : (
        <MemberAnalytics
          teamId={teamId}
          range={range}
          chartRefsCollector={memberChartRefs}
          onDataReady={setMemberData}
        />
      )}
    </div>
  );
}
