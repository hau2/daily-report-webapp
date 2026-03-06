'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Team } from '@daily-report/shared';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TeamWithRole {
  team: Team;
  role: 'manager' | 'member';
}

export default function ManagerIndexPage() {
  const router = useRouter();

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams', 'my'],
    queryFn: () => api.get<TeamWithRole[]>('/teams/my'),
  });

  const managedTeams = teams?.filter((t) => t.role === 'manager') ?? [];

  useEffect(() => {
    if (!isLoading && managedTeams.length === 1) {
      router.replace(`/manager/${managedTeams[0].team.id}`);
    }
  }, [isLoading, managedTeams, router]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-muted-foreground">Loading teams...</p>
      </div>
    );
  }

  if (managedTeams.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Manager Dashboard</h1>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              You are not a manager of any team.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If exactly one managed team, the useEffect redirect handles it.
  // For multiple teams, show selection:
  if (managedTeams.length === 1) {
    return null; // Redirect in progress
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Manager Dashboard</h1>
      <p className="mb-4 text-muted-foreground">
        Select a team to view reports:
      </p>
      <div className="space-y-3">
        {managedTeams.map(({ team }) => (
          <Link key={team.id} href={`/manager/${team.id}`}>
            <Card className="cursor-pointer transition-colors hover:bg-gray-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">
                  {team.name}
                </CardTitle>
                <Badge>Manager</Badge>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
