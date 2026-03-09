'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
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

type VerifyState = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<VerifyState>('loading');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) {
      setState('error');
      return;
    }

    api
      .post<{ message: string }>('/auth/verify-email', { token })
      .then(async () => {
        // Clear stale auth cache and logout so user gets a fresh session
        queryClient.clear();
        try { await api.post('/auth/logout'); } catch {}
        setState('success');
      })
      .catch(() => {
        setState('error');
      });
  }, [token, queryClient]);

  if (state === 'loading') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verifying your email...</CardTitle>
          <CardDescription>Please wait while we verify your email address.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (state === 'success') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email verified!</CardTitle>
          <CardDescription>
            Your email address has been successfully verified.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You can now sign in to your account.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/login">Sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Verification failed</CardTitle>
        <CardDescription>
          Verification failed. The link may have expired or is invalid.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Please register again to request a new verification email.
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href="/register">Back to register</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
