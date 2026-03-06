'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api-client';
import type { Team } from '@daily-report/shared';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface TeamWithRole {
  team: Team;
  role: 'owner' | 'member';
}

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();

  const { data: teams, isLoading: isTeamsLoading } = useQuery({
    queryKey: ['teams', 'my'],
    queryFn: () => api.get<TeamWithRole[]>('/teams/my'),
    enabled: isAuthenticated,
  });

  return (
    <div>
      <h2 className="text-2xl font-bold">
        Welcome, {user?.email ?? 'there'}!
      </h2>
      <p className="mt-2 text-gray-600">Your dashboard will appear here.</p>

      <div className="mt-6">
        {!isTeamsLoading && teams && teams.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Get started</CardTitle>
              <CardDescription>
                Create your first team to start logging daily reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/teams/new">Create a team</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!isTeamsLoading && teams && teams.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your teams</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {teams.map(({ team }) => (
                  <li key={team.id}>
                    <Link
                      href={`/teams/${team.id}`}
                      className="text-sm underline hover:text-foreground"
                    >
                      {team.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
