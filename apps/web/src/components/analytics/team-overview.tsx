'use client';

import type { AnalyticsRange } from '@daily-report/shared';

interface TeamOverviewProps {
  teamId: string;
  range: AnalyticsRange;
}

export function TeamOverview({ teamId, range }: TeamOverviewProps) {
  return (
    <div className="py-12 text-center text-muted-foreground">
      Loading team overview for {teamId} ({range})...
    </div>
  );
}
