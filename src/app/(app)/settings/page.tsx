'use client';

import { PageHeader } from '@/components/layout/page-header';
import { CloudSyncPanel } from '@/components/settings/cloud-sync-panel';
import { UsersPanel } from '@/components/settings/users-panel';
import { AccessGate } from '@/components/shared/access-gate';
import { BRAND } from '@/lib/brand';
import { isAuthRequired, isCloudSyncAvailable } from '@/lib/supabase/config';

export default function SettingsPage() {
  const supabaseAuth = isAuthRequired();
  const cloudSync = isCloudSyncAvailable();

  const content = (
    <div className="mx-auto max-w-3xl space-y-6">
      {supabaseAuth ? <UsersPanel /> : null}
      {cloudSync ? <CloudSyncPanel /> : null}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="النظام" title="الإعدادات" />

      {supabaseAuth ? <AccessGate permission="users.manage">{content}</AccessGate> : content}

      <p className="text-center text-[11px] text-muted-foreground">{BRAND.fullName}</p>
    </div>
  );
}
