'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: (failureCount, error) => {
          // Do not retry on 401 or 403 responses
          if (
            error instanceof Error &&
            (error.message.includes('401') ||
              error.message.includes('403') ||
              error.message.toLowerCase().includes('unauthorized') ||
              error.message.toLowerCase().includes('forbidden'))
          ) {
            return false;
          }
          return failureCount < 3;
        },
      },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
