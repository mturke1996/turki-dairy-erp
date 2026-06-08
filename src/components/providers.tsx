'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useErpStore } from '@/lib/store/use-erp-store';
import { bootstrapAuthSession } from '@/lib/supabase/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { initDatabase, stopDatabase, useDbStore } from '@/lib/supabase/live-db';
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
  const auth = useErpStore((s) => s.auth);
  const hadAuthRef = useRef(false);
  const lastDbErrorRef = useRef<string | null>(null);

  useEffect(() => {
    purgeLegacyStorage();

    void (async () => {
      if (!configured) {
        useErpStore.getState().setHydrated(true);
        setReady(true);
        return;
      }

      try {
        await bootstrapAuthSession();
      } catch {
        useErpStore.getState().logout();
      } finally {
        useErpStore.getState().setHydrated(true);
        setReady(true);
      }
    })();
  }, [configured]);

  // تهيئة DB عند وجود جلسة — مسار واحد للتحميل والحفظ الفوري
  useEffect(() => {
    if (!configured || !ready || !auth) return;
    void initDatabase().then((res) => {
      if (!res.ok && res.error) toast.error(res.error);
    });
  }, [configured, ready, auth]);

  useEffect(() => {
    if (auth) hadAuthRef.current = true;
    if (!configured || !ready) return;
    if (hadAuthRef.current && !auth) {
      stopDatabase();
      hadAuthRef.current = false;
    }
  }, [configured, ready, auth]);

  // إظهار أخطاء الحفظ للمستخدم
  useEffect(() => {
    return useDbStore.subscribe((state) => {
      if (state.status === 'error' && state.lastError && state.lastError !== lastDbErrorRef.current) {
        lastDbErrorRef.current = state.lastError;
        toast.error(state.lastError);
      }
      if (state.status === 'idle') lastDbErrorRef.current = null;
    });
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
