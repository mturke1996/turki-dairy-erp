'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { AppSplash } from '@/components/layout/app-splash';
import { useErpStore } from '@/lib/store/use-erp-store';
import { useHydrated } from '@/lib/store/use-derived';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const auth = useErpStore((s) => s.auth);

  useEffect(() => {
    if (!hydrated || !isSupabaseConfigured()) return;
    if (!auth) router.replace('/login');
  }, [hydrated, auth, router]);

  if (!hydrated) return <AppSplash />;
  if (!auth) return null;

  return <AppShell>{children}</AppShell>;
}
