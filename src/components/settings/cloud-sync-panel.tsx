'use client';

import { useEffect, useState } from 'react';
import { Database, Radio } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDbStore } from '@/lib/supabase/live-db';

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'danger' | 'neutral' }> = {
  idle: { label: 'متصل — حفظ فوري', variant: 'success' },
  loading: { label: 'جارٍ التحميل…', variant: 'info' },
  saving: { label: 'جارٍ الحفظ…', variant: 'info' },
  error: { label: 'خطأ اتصال', variant: 'danger' },
  offline: { label: 'غير متصل', variant: 'warning' },
  unconfigured: { label: 'غير مهيّأ', variant: 'neutral' },
};

const REALTIME_BADGE: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'neutral' }> = {
  connected: { label: 'تحديث لحظي نشط', variant: 'success' },
  connecting: { label: 'جارٍ الاتصال…', variant: 'info' },
  disconnected: { label: 'تحديث لحظي متوقف', variant: 'warning' },
};

/** حالة الاتصال بـ PostgreSQL — بدون مزامنة يدوية */
export function CloudSyncPanel() {
  const [mounted, setMounted] = useState(false);
  const status = useDbStore((s) => s.status);
  const realtimeStatus = useDbStore((s) => s.realtimeStatus);
  const lastSavedAt = useDbStore((s) => s.lastSavedAt);
  const lastError = useDbStore((s) => s.lastError);

  useEffect(() => setMounted(true), []);

  const badge = STATUS_BADGE[mounted ? status : 'idle'] ?? STATUS_BADGE.idle;
  const rtBadge = REALTIME_BADGE[mounted ? realtimeStatus : 'connecting'] ?? REALTIME_BADGE.connecting;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Database className="h-4.5 w-4.5 text-meadow-600" />
          قاعدة البيانات
        </CardTitle>
        <CardDescription>
          كل عملية تُحفظ مباشرة في PostgreSQL وتظهر فوراً على أجهزة الفريق — بدون مزامنة يدوية.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <p className="text-[13px] font-semibold">حالة الحفظ</p>
            {lastSavedAt ? (
              <p className="text-[11.5px] text-muted-foreground">
                آخر حفظ: {new Date(lastSavedAt).toLocaleString('ar-LY')}
              </p>
            ) : (
              <p className="text-[11.5px] text-muted-foreground">Supabase PostgreSQL</p>
            )}
          </div>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-[13px] font-semibold">التحديث بين الأجهزة</p>
              <p className="text-[11.5px] text-muted-foreground">Realtime — إضافة زميلك تظهر لديك مباشرة</p>
            </div>
          </div>
          <Badge variant={rtBadge.variant}>{rtBadge.label}</Badge>
        </div>

        {mounted && lastError && (status === 'error' || status === 'offline') ? (
          <p className="rounded-lg bg-rose-50 p-2 text-[11px] text-rose-600" dir="ltr">{lastError}</p>
        ) : null}

        {mounted && realtimeStatus === 'disconnected' && status === 'idle' ? (
          <p className="text-[11.5px] text-muted-foreground">
            إذا لم تظهر التحديثات فوراً، طبّق migration <span dir="ltr">0012_enable_realtime.sql</span> في Supabase.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
