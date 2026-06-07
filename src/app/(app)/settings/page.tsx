'use client';

import { PageHeader } from '@/components/layout/page-header';
import { CloudSyncPanel } from '@/components/settings/cloud-sync-panel';
import { UsersPanel } from '@/components/settings/users-panel';
import { BRAND } from '@/lib/brand';
import { isAuthRequired, isCloudSyncAvailable } from '@/lib/supabase/config';

export default function SettingsPage() {
  const supabaseAuth = isAuthRequired();
  const cloudSync = isCloudSyncAvailable();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="النظام" title="الإعدادات" />

      <div className="mx-auto max-w-3xl space-y-6">
        {supabaseAuth ? <UsersPanel /> : null}
        {cloudSync ? <CloudSyncPanel /> : null}
      </div>

      <p className="text-center text-[11px] text-muted-foreground">{BRAND.fullName}</p>
    </div>
  );
}
