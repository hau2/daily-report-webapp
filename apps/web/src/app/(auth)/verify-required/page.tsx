'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function VerifyRequiredPage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [cooldown, setCooldown] = useState(0);
  const [isSending, setIsSending] = useState(false);

  // Redirect verified users to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.emailVerified) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  async function handleResend() {
    setIsSending(true);
    try {
      await api.post<{ message: string }>('/auth/resend-verification');
      toast.success('Verification email sent! Check your inbox.');
      setCooldown(60);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to resend verification email',
      );
    } finally {
      setIsSending(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
          <CardDescription>Please wait.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (user.emailVerified) {
    return null;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>
          We sent a verification email to <strong>{user.email}</strong>. Please
          check your inbox and click the verification link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleResend}
          disabled={cooldown > 0 || isSending}
          className="w-full"
        >
          {isSending
            ? 'Sending...'
            : cooldown > 0
              ? `Resend in ${cooldown}s`
              : 'Resend verification email'}
        </Button>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          {logout.isPending ? 'Logging out...' : 'Back to login'}
        </Button>
      </CardFooter>
    </Card>
  );
}
