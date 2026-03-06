'use client';

import { useAuth } from '@/hooks/use-auth';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h2 className="text-2xl font-bold">
        Welcome, {user?.email ?? 'there'}!
      </h2>
      <p className="mt-2 text-gray-600">Your dashboard will appear here.</p>
    </div>
  );
}
