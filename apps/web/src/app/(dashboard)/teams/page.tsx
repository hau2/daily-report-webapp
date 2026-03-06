'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Team } from '@daily-report/shared';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TeamWithRole {
  team: Team;
  role: 'manager' | 'member';
}

export default function TeamsPage() {
  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams', 'my'],
    queryFn: () => api.get<TeamWithRole[]>('/teams/my'),
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Teams</h1>
        <Button asChild>
          <Link href="/teams/new">Create Team</Link>
        </Button>
      </div>

      {isLoading && (
        <p className="text-muted-foreground">Loading your teams...</p>
      )}

      {!isLoading && teams && teams.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="mb-4 text-muted-foreground">You have no teams yet.</p>
            <Button asChild>
              <Link href="/teams/new">Create a team</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && teams && teams.length > 0 && (
        <div className="space-y-3">
          {teams.map(({ team, role }) => (
            <Card key={team.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">{team.name}</CardTitle>
                <div className="flex items-center gap-3">
                  <Badge variant={role === 'manager' ? 'default' : 'secondary'}>
                    {role === 'manager' ? 'Manager' : 'Member'}
                  </Badge>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/teams/${team.id}`}>View</Link>
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
