'use client';

import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useErpStore } from '@/lib/store/use-erp-store';
import { bootstrapAuthSession } from '@/lib/supabase/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { initCloudSync } from '@/lib/supabase/sync';
import { DatabaseSetupRequired } from '@/components/layout/database-setup-required';
import { AppSplash } from '@/components/layout/app-splash';

function purgeLegacyStorage() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('turki-dairy-erp');
  localStorage.removeItem('turki-cloud-sync-enabled');
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    purgeLegacyStorage();

    void (async () => {
      if (!configured) {
        useErpStore.getState().setHydrated(true);
        setReady(true);
        return;
      }

      try {
        const authed = await bootstrapAuthSession();
        if (authed) await initCloudSync();
      } catch {
        useErpStore.getState().logout();
      } finally {
        useErpStore.getState().setHydrated(true);
        setReady(true);
      }
    })();
  }, [configured]);

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

  if (!ready) return <AppSplash />;

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange={false}>
      <QueryClientProvider client={client}>
        <TooltipProvider delayDuration={80}>
          {!configured ? <DatabaseSetupRequired /> : children}
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
