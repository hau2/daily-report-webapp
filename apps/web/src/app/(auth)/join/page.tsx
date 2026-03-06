'use client';

import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function decodeTokenPayload(token: string): { inviteeEmail: string; teamId: string } {
  try {
    const [, b64] = token.split('.');
    const payload = JSON.parse(atob(b64)) as Record<string, unknown>;
    return {
      inviteeEmail: typeof payload.inviteeEmail === 'string' ? payload.inviteeEmail : '',
      teamId: typeof payload.teamId === 'string' ? payload.teamId : '',
    };
  } catch {
    return { inviteeEmail: '', teamId: '' };
  }
}

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { isAuthenticated, isLoading, user } = useAuth();

  const acceptMutation = useMutation({
    mutationFn: () =>
      api.post<{ message: string; teamId: string }>('/teams/invitations/accept', { token }),
    onSuccess: () => {
      toast.success('You joined the team!');
      router.push('/dashboard');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to accept invitation');
    },
  });

  if (!token) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invalid invitation link</CardTitle>
          <CardDescription>
            This invitation link is missing or malformed.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/login" className="text-sm underline hover:text-foreground">
            Go to login
          </Link>
        </CardFooter>
      </Card>
    );
  }

  const { inviteeEmail } = decodeTokenPayload(token);

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>You&apos;ve been invited to join a team</CardTitle>
          <CardDescription>
            This invitation was sent to{' '}
            <span className="font-medium">{inviteeEmail}</span>. Please log in
            or register with that email address.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex gap-3">
          <Button
            onClick={() =>
              router.push(`/login?next=${encodeURIComponent(`/join?token=${token}`)}`)
            }
          >
            Log in
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/register?next=${encodeURIComponent(`/join?token=${token}`)}`)
            }
          >
            Register
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const emailMismatch = user?.email !== inviteeEmail;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Accept invitation</CardTitle>
        <CardDescription>
          You have been invited to join a team. This invitation was sent to{' '}
          <span className="font-medium">{inviteeEmail}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {emailMismatch && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
            Warning: You are logged in as{' '}
            <span className="font-medium">{user?.email}</span> but this
            invitation is for{' '}
            <span className="font-medium">{inviteeEmail}</span>. The accept
            request will fail.
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => acceptMutation.mutate()}
          disabled={acceptMutation.isPending}
        >
          {acceptMutation.isPending ? 'Accepting...' : 'Accept invitation'}
        </Button>
      </CardFooter>
    </Card>
  );
}
