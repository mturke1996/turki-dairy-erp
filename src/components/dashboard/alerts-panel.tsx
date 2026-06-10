'use client';

import Link from 'next/link';
import { AlertTriangle, Bell, ChevronLeft, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import type { SystemAlert } from '@/lib/domain/types';
import { cn } from '@/lib/utils';

const LEVEL_META = {
  danger: {
    dot: 'bg-rose-500',
    badge: 'danger' as const,
    ring: 'border-rose-200/80 bg-rose-50/50 hover:bg-rose-50',
    label: 'عاجل',
  },
  warning: {
    dot: 'bg-sun-500',
    badge: 'warning' as const,
    ring: 'border-sun-200/80 bg-sun-50/40 hover:bg-sun-50',
    label: 'تحذير',
  },
  info: {
    dot: 'bg-navy-500',
    badge: 'info' as const,
    ring: 'border-navy-200/70 bg-navy-50/30 hover:bg-navy-50/60',
    label: 'معلومة',
  },
};

function countByLevel(alerts: SystemAlert[], level: SystemAlert['level']) {
  return alerts.filter((a) => a.level === level).length;
}

export function AlertsPanel({
  alerts,
  className,
  limit,
  compact,
}: {
  alerts: SystemAlert[];
  className?: string;
  /** يحدّد عدد التنبيهات المعروضة (للجوال) */
  limit?: number;
  compact?: boolean;
}) {
  const danger = countByLevel(alerts, 'danger');
  const warning = countByLevel(alerts, 'warning');
  const info = countByLevel(alerts, 'info');

  const visible = limit ? alerts.slice(0, limit) : alerts;

  return (
    <Card id="alerts" className={cn('scroll-mt-24', compact && 'border-0 shadow-none', className)}>
      <CardHeader className={cn(compact && 'px-0 pt-0')}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className={cn('flex items-center gap-2', compact && 'text-[14px]')}>
              <Bell className="h-4 w-4 text-sun-600" />
              التنبيهات
            </CardTitle>
            {!compact ? (
              <CardDescription>مراقبة تلقائية للمخزون والهدر والنقد والديون والفترة</CardDescription>
            ) : null}
          </div>
          {alerts.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {danger > 0 ? <Badge variant="danger">{danger} عاجل</Badge> : null}
              {warning > 0 ? <Badge variant="warning">{warning} تحذير</Badge> : null}
              {info > 0 ? <Badge variant="info">{info} معلومة</Badge> : null}
            </div>
          ) : (
            <Badge variant="success" className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              سليم
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn('space-y-2.5', compact && 'px-0 pb-0')}>
        {visible.length ? (
          visible.map((a) => {
            const meta = LEVEL_META[a.level];
            const body = (
              <div
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-3 transition-colors',
                  meta.ring,
                )}
              >
                <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', meta.dot)} />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold text-foreground">{a.title}</p>
                    <Badge variant={meta.badge} className="text-[10px]">
                      {meta.label}
                    </Badge>
                  </div>
                  <p className="text-[12px] leading-relaxed text-muted-foreground">{a.detail}</p>
                </div>
                {a.href ? <ChevronLeft className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> : null}
              </div>
            );
            return a.href ? (
              <Link key={a.id} href={a.href} className="block">
                {body}
              </Link>
            ) : (
              <div key={a.id}>{body}</div>
            );
          })
        ) : (
          <EmptyState
            icon={ShieldCheck}
            title="كل شيء على ما يرام"
            description="لا توجد تنبيهات — المخزون والنقد والديون ضمن الحدود المعتادة."
          />
        )}
        {limit && alerts.length > limit ? (
          <Link
            href="#alerts"
            className="block rounded-lg bg-canvas-sunken px-3 py-2 text-center text-[12px] font-semibold text-muted-foreground transition-colors active:bg-canvas-sunken/80"
          >
            عرض كل التنبيهات ({alerts.length})
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function AlertsBanner({ alerts }: { alerts: SystemAlert[] }) {
  const urgent = alerts.filter((a) => a.level === 'danger');
  if (!urgent.length) return null;

  return (
    <div className="rounded-2xl border border-rose-200/80 bg-gradient-to-l from-rose-50/80 via-card to-card p-4 shadow-whisper">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 ring-1 ring-rose-200">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[14px] font-bold text-rose-900">
            {urgent.length === 1 ? 'تنبيه عاجل يتطلب انتباهك' : `${urgent.length} تنبيهات عاجلة`}
          </p>
          <ul className="space-y-1">
            {urgent.slice(0, 3).map((a) => (
              <li key={a.id} className="text-[12.5px] text-rose-800">
                {a.href ? (
                  <Link href={a.href} className="font-medium underline-offset-2 hover:underline">
                    {a.title}: {a.detail}
                  </Link>
                ) : (
                  <span>
                    <strong>{a.title}:</strong> {a.detail}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {alerts.length > urgent.length ? (
            <Link href="#alerts" className="text-[12px] font-semibold text-rose-700 hover:underline">
              عرض كل التنبيهات ({alerts.length}) ←
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
