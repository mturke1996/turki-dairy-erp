'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDownToLine, ArrowUpToLine, Plug, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import {
  useSyncStore,
  enableAndBootstrap,
  pullFromCloud,
  pushToCloud,
  stopAutoSync,
} from '@/lib/supabase/sync';
import { testConnection } from '@/lib/supabase/repository';

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'danger' | 'neutral' }> = {
  disabled: { label: 'متوقفة', variant: 'neutral' },
  idle: { label: 'متزامنة', variant: 'success' },
  syncing: { label: 'جارٍ السحب…', variant: 'info' },
  pushing: { label: 'جارٍ الرفع…', variant: 'info' },
  conflict: { label: 'تعارض — جارٍ الحل', variant: 'warning' },
  error: { label: 'خطأ', variant: 'danger' },
  offline: { label: 'غير متصل', variant: 'warning' },
};

export function CloudSyncPanel() {
  const [mounted, setMounted] = useState(false);
  const [working, setWorking] = useState(false);
  const configured = useSyncStore((s) => s.configured);
  const enabled = useSyncStore((s) => s.enabled);
  const status = useSyncStore((s) => s.status);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const lastError = useSyncStore((s) => s.lastError);

  useEffect(() => setMounted(true), []);

  if (!configured) return null;

  const badge = STATUS_BADGE[mounted ? status : 'disabled'] ?? STATUS_BADGE.disabled;
  const isEnabled = mounted && enabled;

  async function toggle(v: boolean) {
    if (v) {
      setWorking(true);
      const res = await enableAndBootstrap();
      setWorking(false);
      toast[res.ok ? 'success' : 'error'](
        res.ok ? 'تم تفعيل المزامنة ورفع البيانات الحالية' : `تعذّر التفعيل: ${res.error ?? ''}`,
      );
    } else {
      stopAutoSync();
      useSyncStore.getState().setEnabled(false);
      toast.message('تم إيقاف المزامنة السحابية');
    }
  }

  async function doTest() {
    setWorking(true);
    const res = await testConnection();
    setWorking(false);
    toast[res.ok ? 'success' : 'error'](res.ok ? 'الاتصال بـ Supabase سليم' : `فشل الاتصال: ${res.error ?? ''}`);
  }

  async function doPull() {
    setWorking(true);
    const res = await pullFromCloud();
    setWorking(false);
    toast[res.ok ? 'success' : 'error'](res.ok ? 'تم سحب البيانات من السحابة' : `تعذّر السحب: ${res.error ?? ''}`);
  }

  async function doPush() {
    setWorking(true);
    const res = await pushToCloud();
    setWorking(false);
    toast[res.ok ? 'success' : 'error'](res.ok ? 'تم رفع البيانات إلى السحابة' : `تعذّر الرفع: ${res.error ?? ''}`);
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold">المزامنة السحابية</p>
          {isEnabled && lastSyncAt ? (
            <p className="text-[11.5px] text-muted-foreground">
              آخر مزامنة: {new Date(lastSyncAt).toLocaleString('ar-LY')}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          <Switch checked={isEnabled} disabled={working} onCheckedChange={toggle} aria-label="تفعيل المزامنة" />
        </div>
      </div>

      {mounted && lastError && (status === 'error' || status === 'offline') && (
        <p className="rounded-lg bg-rose-50 p-2 text-[11px] text-rose-600" dir="ltr">
          {lastError}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={doTest} disabled={working}>
          {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
          اختبار الاتصال
        </Button>
        <Button variant="outline" size="sm" onClick={doPull} disabled={working || !isEnabled}>
          <ArrowDownToLine className="h-3.5 w-3.5" />
          سحب من السحابة
        </Button>
        <Button variant="outline" size="sm" onClick={doPush} disabled={working || !isEnabled}>
          <ArrowUpToLine className="h-3.5 w-3.5" />
          رفع إلى السحابة
        </Button>
      </div>
      </CardContent>
    </Card>
  );
}
