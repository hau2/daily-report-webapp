'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { inviteMemberSchema, type InviteMemberInput, type Team } from '@daily-report/shared';
import { api } from '@/lib/api-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TeamWithRole {
  team: Team;
  role: 'manager' | 'member';
}

interface InviteFormProps {
  teamId: string;
}

function InviteForm({ teamId }: InviteFormProps) {
  const form = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: InviteMemberInput) =>
      api.post<{ message: string }>(`/teams/${teamId}/invitations`, data),
    onSuccess: () => {
      toast.success('Invitation sent!');
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send invitation');
    },
  });

  function onSubmit(data: InviteMemberInput) {
    mutation.mutate(data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite a member</CardTitle>
        <CardDescription>
          Send an invitation email to add someone to this team.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="colleague@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Sending...' : 'Send Invite'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function TeamDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams', 'my'],
    queryFn: () => api.get<TeamWithRole[]>('/teams/my'),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-muted-foreground">Loading team...</p>
      </div>
    );
  }

  const entry = teams?.find((t) => t.team.id === id);

  if (!entry) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <Link
            href="/teams"
            className="text-sm text-muted-foreground underline hover:text-foreground"
          >
            &larr; Back to teams
          </Link>
        </div>
        <p className="text-muted-foreground">
          Team not found or you are not a member.
        </p>
      </div>
    );
  }

  const { team, role } = entry;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/teams"
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          &larr; Back to teams
        </Link>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold">{team.name}</h1>
        <Badge variant={role === 'manager' ? 'default' : 'secondary'}>
          {role === 'manager' ? 'Manager' : 'Member'}
        </Badge>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              Member management will be available once members join.
            </CardDescription>
          </CardHeader>
        </Card>

        {role === 'manager' && <InviteForm teamId={id} />}
      </div>
    </div>
  );
}
