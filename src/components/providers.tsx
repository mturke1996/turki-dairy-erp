'use client';

import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useErpStore } from '@/lib/store/use-erp-store';
import { bootstrapAuthSession } from '@/lib/supabase/auth';
import { isAuthRequired } from '@/lib/supabase/config';
import { initCloudSync } from '@/lib/supabase/sync';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void useErpStore.persist.rehydrate();
    void (async () => {
      if (isAuthRequired()) {
        try {
          await bootstrapAuthSession();
        } catch {
          useErpStore.getState().logout();
        }
      }
      initCloudSync();
    })();
  }, []);

  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60_000,
            gcTime: 30 * 60 * 1000,
            placeholderData: keepPreviousData,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            retry: 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange={false}>
      <QueryClientProvider client={client}>
        <TooltipProvider delayDuration={80}>{children}</TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
