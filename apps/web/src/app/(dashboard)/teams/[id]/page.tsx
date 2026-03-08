'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  role: 'owner' | 'member';
}

interface TeamMemberRow {
  userId: string;
  role: string;
  joinedAt: string;
  email: string;
  displayName: string | null;
}

interface PendingInvitation {
  email: string;
  invitedAt: string;
  expiresAt: string;
}

interface InviteFormProps {
  teamId: string;
}

function InviteForm({ teamId }: InviteFormProps) {
  const queryClient = useQueryClient();
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
      queryClient.invalidateQueries({ queryKey: ['teams', teamId, 'invitations'] });
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

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams', 'my'],
    queryFn: () => api.get<TeamWithRole[]>('/teams/my'),
  });

  const { data: members } = useQuery({
    queryKey: ['teams', id, 'members'],
    queryFn: () => api.get<TeamMemberRow[]>(`/teams/${id}/members`),
    enabled: !!id,
  });

  const entry = teams?.find((t) => t.team.id === id);
  const isOwner = entry?.role === 'owner';

  const { data: invitations } = useQuery({
    queryKey: ['teams', id, 'invitations'],
    queryFn: () => api.get<PendingInvitation[]>(`/teams/${id}/invitations`),
    enabled: !!id && isOwner,
  });

  // --- Mutations ---

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      api.delete<{ message: string }>(`/teams/${id}/members/${userId}`),
    onSuccess: () => {
      toast.success('Member removed');
      queryClient.invalidateQueries({ queryKey: ['teams', id, 'members'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove member');
    },
  });

  const transferOwnershipMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      api.post<{ message: string }>(`/teams/${id}/transfer-ownership`, { targetUserId }),
    onSuccess: () => {
      toast.success('Ownership transferred');
      queryClient.invalidateQueries({ queryKey: ['teams', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['teams', id, 'members'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to transfer ownership');
    },
  });

  const leaveTeamMutation = useMutation({
    mutationFn: () =>
      api.post<{ message: string }>(`/teams/${id}/leave`),
    onSuccess: () => {
      toast.success('You have left the team');
      queryClient.invalidateQueries({ queryKey: ['teams', 'my'] });
      router.push('/teams');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to leave team');
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: (email: string) =>
      api.delete<{ message: string }>(`/teams/${id}/invitations/${encodeURIComponent(email)}`),
    onSuccess: () => {
      toast.success('Invitation cancelled');
      queryClient.invalidateQueries({ queryKey: ['teams', id, 'invitations'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel invitation');
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: () =>
      api.delete<{ message: string }>(`/teams/${id}`),
    onSuccess: () => {
      toast.success('Team deleted');
      queryClient.invalidateQueries({ queryKey: ['teams', 'my'] });
      router.push('/teams');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete team');
    },
  });

  // --- Handlers ---

  function handleRemoveMember(member: TeamMemberRow) {
    const confirmed = window.confirm(
      `Remove ${member.displayName || member.email} from the team?`
    );
    if (confirmed) {
      removeMemberMutation.mutate(member.userId);
    }
  }

  function handleTransferOwnership(member: TeamMemberRow) {
    const confirmed = window.confirm(
      `This will make ${member.displayName || member.email} the owner and you will become a regular member. Continue?`
    );
    if (confirmed) {
      transferOwnershipMutation.mutate(member.userId);
    }
  }

  function handleLeaveTeam(teamName: string) {
    const confirmed = window.confirm(
      `Are you sure you want to leave ${teamName}?`
    );
    if (confirmed) {
      leaveTeamMutation.mutate();
    }
  }

  function handleCancelInvitation(email: string) {
    const confirmed = window.confirm(
      `Cancel the invitation to ${email}?`
    );
    if (confirmed) {
      cancelInvitationMutation.mutate(email);
    }
  }

  function handleDeleteTeam(teamName: string) {
    const typedName = window.prompt(
      `This will permanently delete "${teamName}" and all its data. Type the team name to confirm:`
    );
    if (typedName === teamName) {
      deleteTeamMutation.mutate();
    } else if (typedName !== null) {
      toast.error('Team name did not match. Deletion cancelled.');
    }
  }

  // --- Render ---

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-muted-foreground">Loading team...</p>
      </div>
    );
  }

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
        <Badge variant={role === 'owner' ? 'default' : 'secondary'}>
          {role === 'owner' ? 'Owner' : 'Member'}
        </Badge>
        {role === 'member' && (
          <Button
            variant="destructive"
            size="sm"
            disabled={leaveTeamMutation.isPending}
            onClick={() => handleLeaveTeam(team.name)}
          >
            {leaveTeamMutation.isPending ? 'Leaving...' : 'Leave Team'}
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {/* Members list */}
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent>
            {members && members.length > 0 ? (
              <div className="space-y-3">
                {members.map((m) => (
                  <div key={m.userId} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="font-medium">{m.displayName || m.email}</p>
                      {m.displayName && <p className="text-sm text-muted-foreground">{m.email}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={m.role === 'owner' ? 'default' : 'secondary'}>
                        {m.role === 'owner' ? 'Owner' : 'Member'}
                      </Badge>
                      {isOwner && m.role !== 'owner' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={transferOwnershipMutation.isPending}
                            onClick={() => handleTransferOwnership(m)}
                          >
                            Transfer Ownership
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={removeMemberMutation.isPending}
                            onClick={() => handleRemoveMember(m)}
                          >
                            Remove
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Pending invitations (owner only) */}
        {isOwner && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              {invitations && invitations.length > 0 ? (
                <div className="space-y-3">
                  {invitations.map((inv) => (
                    <div key={inv.email} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="font-medium">{inv.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Invited {new Date(inv.invitedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={cancelInvitationMutation.isPending}
                        onClick={() => handleCancelInvitation(inv.email)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No pending invitations.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Invite form (owner only) */}
        {isOwner && <InviteForm teamId={id} />}

        {/* Danger zone (owner only) */}
        {isOwner && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that permanently affect this team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                disabled={deleteTeamMutation.isPending}
                onClick={() => handleDeleteTeam(team.name)}
              >
                {deleteTeamMutation.isPending ? 'Deleting...' : 'Delete Team'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
