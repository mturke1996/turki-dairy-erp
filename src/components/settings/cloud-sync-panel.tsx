'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDownToLine, ArrowUpToLine, Database, Loader2, Plug, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSyncStore, pullFromCloud, pushToCloud } from '@/lib/supabase/sync';
import { testConnection } from '@/lib/supabase/repository';

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'danger' | 'neutral' }> = {
  idle: { label: 'متصل', variant: 'success' },
  syncing: { label: 'جارٍ التحميل…', variant: 'info' },
  pushing: { label: 'جارٍ الحفظ…', variant: 'info' },
  conflict: { label: 'تعارض — جارٍ الحل', variant: 'warning' },
  error: { label: 'خطأ', variant: 'danger' },
  offline: { label: 'غير متصل', variant: 'warning' },
  unconfigured: { label: 'غير مهيّأ', variant: 'neutral' },
};

export function CloudSyncPanel() {
  const [mounted, setMounted] = useState(false);
  const [working, setWorking] = useState(false);
  const status = useSyncStore((s) => s.status);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const lastError = useSyncStore((s) => s.lastError);
  const remoteVersion = useSyncStore((s) => s.remoteVersion);

  useEffect(() => setMounted(true), []);

  const badge = STATUS_BADGE[mounted ? status : 'idle'] ?? STATUS_BADGE.idle;

  async function doTest() {
    setWorking(true);
    const res = await testConnection();
    setWorking(false);
    toast[res.ok ? 'success' : 'error'](res.ok ? 'الاتصال بقاعدة البيانات سليم' : `فشل: ${res.error ?? ''}`);
  }

  async function doPull() {
    setWorking(true);
    const res = await pullFromCloud();
    setWorking(false);
    toast[res.ok ? 'success' : 'error'](res.ok ? 'تم التحميل من PostgreSQL' : `تعذّر: ${res.error ?? ''}`);
  }

  async function doPush() {
    setWorking(true);
    const res = await pushToCloud();
    setWorking(false);
    toast[res.ok ? 'success' : 'error'](res.ok ? 'تم الحفظ في PostgreSQL' : `تعذّر: ${res.error ?? ''}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Database className="h-4.5 w-4.5 text-meadow-600" />
          قاعدة البيانات (Supabase)
        </CardTitle>
        <CardDescription>
          مصدر البيانات الوحيد — PostgreSQL. التعديلات تُحفظ تلقائياً بعد 1.5 ثانية.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <p className="text-[13px] font-semibold">حالة الاتصال</p>
            {lastSyncAt ? (
              <p className="text-[11.5px] text-muted-foreground">
                آخر مزامنة: {new Date(lastSyncAt).toLocaleString('ar-LY')}
                {remoteVersion > 0 ? ` · v${remoteVersion}` : ''}
              </p>
            ) : (
              <p className="text-[11.5px] text-muted-foreground">PostgreSQL</p>
            )}
          </div>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>

        {mounted && lastError && (status === 'error' || status === 'offline') ? (
          <p className="rounded-lg bg-rose-50 p-2 text-[11px] text-rose-600" dir="ltr">{lastError}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void doTest()} disabled={working}>
            {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
            اختبار الاتصال
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void doPull()} disabled={working}>
            <ArrowDownToLine className="h-3.5 w-3.5" />
            إعادة تحميل
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void doPush()} disabled={working}>
            <ArrowUpToLine className="h-3.5 w-3.5" />
            حفظ الآن
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => window.location.reload()} disabled={working}>
            <RefreshCw className="h-3.5 w-3.5" />
            تحديث الصفحة
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
