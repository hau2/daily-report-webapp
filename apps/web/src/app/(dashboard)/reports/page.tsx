'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export default function ReportsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/reports/${format(new Date(), 'yyyy-MM-dd')}`);
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-muted-foreground">Redirecting to today&apos;s report...</p>
    </div>
  );
}
