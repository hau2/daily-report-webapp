'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Daily Report</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/teams"
              className="text-sm text-gray-600 underline hover:text-gray-900"
            >
              Teams
            </Link>
            <span className="text-sm text-gray-600">{user?.email}</span>
            <Link
              href="/settings"
              className="text-sm text-gray-600 underline hover:text-gray-900"
            >
              Settings
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              {logout.isPending ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
