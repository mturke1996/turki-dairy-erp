'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Cloud, CloudOff, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSyncStore, pullFromCloud } from '@/lib/supabase/sync';

/** زر إعادة تحميل البيانات من PostgreSQL في الشريط العلوي. */
export function CloudSyncButton() {
  const [mounted, setMounted] = useState(false);
  const configured = useSyncStore((s) => s.configured);
  const status = useSyncStore((s) => s.status);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);

  useEffect(() => setMounted(true), []);

  const busy = status === 'syncing' || status === 'pushing';
  const dbReady = mounted && configured;

  async function handleClick() {
    if (dbReady) {
      const res = await pullFromCloud();
      toast[res.ok ? 'success' : 'error'](
        res.ok ? 'تم تحديث البيانات من قاعدة البيانات' : `تعذّر التحديث: ${res.error ?? ''}`,
      );
    } else {
      window.location.reload();
    }
  }

  const title = !mounted
    ? 'تحديث'
    : dbReady
      ? status === 'error'
        ? 'خطأ — اضغط للمحاولة'
        : status === 'offline'
          ? 'غير متصل — اضغط للمحاولة'
          : lastSyncAt
            ? `آخر مزامنة: ${new Date(lastSyncAt).toLocaleTimeString('ar-LY')}`
            : 'تحميل من PostgreSQL'
      : 'إعادة تحميل';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={busy}
      aria-label={title}
      title={title}
      className="relative"
    >
      <RefreshCw className={cn('h-5 w-5', busy && 'animate-spin text-meadow-600')} />
      {mounted && configured && (
        <span className="absolute -bottom-0.5 -left-0.5">
          {status === 'error' || status === 'offline' ? (
            <CloudOff className="h-3 w-3 text-rose-500" />
          ) : status === 'idle' && lastSyncAt ? (
            <Check className="h-3 w-3 text-meadow-600" />
          ) : (
            <Cloud className="h-3 w-3 text-meadow-600" />
          )}
        </span>
      )}
    </Button>
  );
}
