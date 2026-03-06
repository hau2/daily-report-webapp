'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import type { Team } from '@daily-report/shared';

interface TeamWithRole {
  team: Team;
  role: 'owner' | 'member';
}

function NavLink({
  href,
  active,
  children,
  mobile = false,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  mobile?: boolean;
}) {
  const baseClass = mobile
    ? 'py-2 text-base hover:text-gray-900'
    : 'text-sm hover:text-gray-900';
  const activeClass = active
    ? 'font-medium text-gray-900'
    : 'text-gray-600 underline';

  return (
    <Link href={href} className={`${baseClass} ${activeClass}`}>
      {children}
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  // Check if user is a manager of any team
  const { data: teams } = useQuery({
    queryKey: ['teams', 'my'],
    queryFn: () => api.get<TeamWithRole[]>('/teams/my'),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated,
  });

  const isManager = teams?.some((t) => t.role === 'owner') ?? false;

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

  const navLinks = [
    { href: '/reports', label: 'Reports', active: pathname.startsWith('/reports') },
    { href: '/teams', label: 'Teams', active: pathname.startsWith('/teams') },
    ...(isManager
      ? [{ href: '/manager', label: 'Manager', active: pathname.startsWith('/manager') }]
      : []),
    { href: '/settings', label: 'Settings', active: pathname.startsWith('/settings') },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Daily Report</h1>

          {/* Desktop nav */}
          <div className="hidden items-center gap-4 sm:flex">
            {navLinks.map((link) => (
              <NavLink key={link.href} href={link.href} active={link.active}>
                {link.label}
              </NavLink>
            ))}
            <span className="text-sm text-gray-600">{user?.email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              {logout.isPending ? 'Logging out...' : 'Logout'}
            </Button>
          </div>

          {/* Mobile hamburger toggle */}
          <button
            className="p-2 sm:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <nav className="mt-3 flex flex-col gap-3 border-t pt-3 sm:hidden">
            {navLinks.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                active={link.active}
                mobile
              >
                {link.label}
              </NavLink>
            ))}
            <span className="py-2 text-sm text-gray-600">{user?.email}</span>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              {logout.isPending ? 'Logging out...' : 'Logout'}
            </Button>
          </nav>
        )}
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
