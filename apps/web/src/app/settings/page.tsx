'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api-client';
import type { User } from '@daily-report/shared';
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

// ---- Local schemas ----

const profileFormSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(100),
  timezone: z.string().min(1, 'Timezone is required'),
});
type ProfileFormInput = z.infer<typeof profileFormSchema>;

const emailFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  currentPassword: z.string().min(1, 'Current password is required'),
});
type EmailFormInput = z.infer<typeof emailFormSchema>;

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type PasswordFormInput = z.infer<typeof passwordFormSchema>;

// ---- Profile Card ----

function ProfileCard({ user }: { user: User }) {
  const queryClient = useQueryClient();

  const form = useForm<ProfileFormInput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: user.displayName ?? '',
      timezone: user.timezone ?? 'UTC',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ProfileFormInput) =>
      api.patch<User>('/users/me', data),
    onSuccess: () => {
      toast.success('Profile updated');
      void queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  function onSubmit(data: ProfileFormInput) {
    mutation.mutate(data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update your display name and timezone.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="e.g., America/New_York"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Saving...' : 'Save profile'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ---- Email Card ----

function EmailCard({ user }: { user: User }) {
  const queryClient = useQueryClient();

  const form = useForm<EmailFormInput>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      email: '',
      currentPassword: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: EmailFormInput) =>
      api.patch<User>('/users/me', data),
    onSuccess: () => {
      toast.success('Email updated');
      form.reset();
      void queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    },
    onError: (error: Error) => {
      if (error.message.includes('Invalid current password') || error.message.includes('401')) {
        form.setError('currentPassword', { message: 'Incorrect password' });
      } else {
        toast.error(error.message || 'Failed to update email');
      }
    },
  });

  function onSubmit(data: EmailFormInput) {
    mutation.mutate(data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email address</CardTitle>
        <CardDescription>
          Current email: <span className="font-medium">{user.email}</span>
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
                  <FormLabel>New email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="new@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Saving...' : 'Update email'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ---- Password Card ----

function PasswordCard() {
  const { logout } = useAuth();

  const form = useForm<PasswordFormInput>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: PasswordFormInput) =>
      api.patch<User>('/users/me', {
        newPassword: data.newPassword,
        currentPassword: data.currentPassword,
      }),
    onSuccess: () => {
      toast.success('Password updated. Please log in again.');
      logout.mutate();
    },
    onError: (error: Error) => {
      if (error.message.includes('Invalid current password') || error.message.includes('401')) {
        form.setError('currentPassword', { message: 'Incorrect current password' });
      } else {
        toast.error(error.message || 'Failed to update password');
      }
    },
  });

  function onSubmit(data: PasswordFormInput) {
    mutation.mutate(data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Change your password. You will be logged out after changing it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={mutation.isPending || logout.isPending}
            >
              {mutation.isPending ? 'Saving...' : 'Change password'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ---- Settings Page ----

export default function SettingsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => api.get<User>('/users/me'),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isProfileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !userProfile) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          &larr; Back to dashboard
        </Link>
      </div>
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>
      <div className="space-y-6">
        <ProfileCard user={userProfile} />
        <EmailCard user={userProfile} />
        <PasswordCard />
      </div>
    </div>
  );
}
