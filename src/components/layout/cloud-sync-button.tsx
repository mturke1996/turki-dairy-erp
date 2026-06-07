'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Cloud, CloudOff, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSyncStore, pullFromCloud } from '@/lib/supabase/sync';

/**
 * زر إعادة التحميل / المزامنة في الشريط العلوي.
 * • مع تفعيل المزامنة: يسحب أحدث البيانات من Supabase.
 * • بدونها: يعيد تحميل الصفحة.
 */
export function CloudSyncButton() {
  const [mounted, setMounted] = useState(false);
  const enabled = useSyncStore((s) => s.enabled);
  const configured = useSyncStore((s) => s.configured);
  const status = useSyncStore((s) => s.status);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);

  useEffect(() => setMounted(true), []);

  const busy = status === 'syncing' || status === 'pushing';
  const cloudOn = mounted && configured && enabled;

  async function handleClick() {
    if (cloudOn) {
      const res = await pullFromCloud();
      toast[res.ok ? 'success' : 'error'](
        res.ok ? 'تم تحديث البيانات من السحابة' : `تعذّر التحديث: ${res.error ?? ''}`,
      );
    } else {
      window.location.reload();
    }
  }

  const title = !mounted
    ? 'تحديث'
    : cloudOn
      ? status === 'error'
        ? `خطأ مزامنة — اضغط للمحاولة`
        : status === 'offline'
          ? 'غير متصل بالسحابة — اضغط للمحاولة'
          : lastSyncAt
            ? `آخر مزامنة: ${new Date(lastSyncAt).toLocaleTimeString('ar-LY')}`
            : 'مزامنة الآن'
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
          ) : cloudOn ? (
            status === 'idle' && lastSyncAt ? (
              <Check className="h-3 w-3 text-meadow-600" />
            ) : (
              <Cloud className="h-3 w-3 text-meadow-600" />
            )
          ) : null}
        </span>
      )}
    </Button>
  );
}
