'use client';

import { useMemo, useState } from 'react';
import {
  History,
  Plus,
  Pencil,
  Trash2,
  LogIn,
  Download,
  Lock,
  ArrowLeftRight,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useErpStore } from '@/lib/store/use-erp-store';
import { AUDIT_ACTION_LABELS, ROLE_LABELS } from '@/lib/domain/constants';
import type { AuditAction } from '@/lib/domain/types';
import { cn } from '@/lib/utils';

const ACTION_META: Record<AuditAction, { icon: LucideIcon; tone: string }> = {
  create: { icon: Plus, tone: 'bg-meadow-50 text-meadow-700 ring-meadow-100' },
  update: { icon: Pencil, tone: 'bg-navy-50 text-navy-700 ring-navy-100' },
  delete: { icon: Trash2, tone: 'bg-rose-50 text-rose-600 ring-rose-100' },
  login: { icon: LogIn, tone: 'bg-canvas-sunken text-ink-mute ring-border' },
  export: { icon: Download, tone: 'bg-sun-50 text-sun-800 ring-sun-100' },
  close: { icon: Lock, tone: 'bg-navy-50 text-navy-700 ring-navy-100' },
  transfer: { icon: ArrowLeftRight, tone: 'bg-sun-50 text-sun-800 ring-sun-100' },
  pay: { icon: Wallet, tone: 'bg-meadow-50 text-meadow-700 ring-meadow-100' },
};

function timeLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function AuditPage() {
  const logs = useErpStore((s) => s.auditLogs);
  const [filter, setFilter] = useState<string>('all');

  const sorted = useMemo(() => {
    const list = [...logs].sort((a, b) => +new Date(b.performedAt) - +new Date(a.performedAt));
    return filter === 'all' ? list : list.filter((l) => l.action === filter);
  }, [logs, filter]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="النظام"
        title="سجل التدقيق"
        description="توثيق كامل لكل عملية إنشاء أو تعديل أو حذف أو صرف في النظام."
        actions={
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الإجراءات</SelectItem>
              {(Object.keys(AUDIT_ACTION_LABELS) as AuditAction[]).map((a) => (
                <SelectItem key={a} value={a}>{AUDIT_ACTION_LABELS[a]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>الأحداث ({sorted.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <EmptyState icon={History} title="لا توجد أحداث" description="ستُسجّل كل العمليات هنا تلقائياً." />
          ) : (
            <ol className="relative space-y-1 before:absolute before:right-[19px] before:top-2 before:bottom-2 before:w-px before:bg-border">
              {sorted.map((log) => {
                const meta = ACTION_META[log.action];
                const Icon = meta.icon;
                return (
                  <li key={log.id} className="relative flex items-start gap-3 rounded-lg px-1 py-2.5 hover:bg-canvas-sunken/50">
                    <span className={cn('z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1', meta.tone)}>
                      <Icon className="h-4.5 w-4.5 stroke-[1.7]" />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-[13px] font-medium text-foreground">{log.summary}</p>
                        <Badge variant="neutral" className="font-normal">{AUDIT_ACTION_LABELS[log.action]}</Badge>
                      </div>
                      <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                        {log.performedBy} · {ROLE_LABELS[log.performedByRole]}
                        {log.reason ? ` · السبب: ${log.reason}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 pt-1 text-[11px] tabular text-muted-foreground" dir="ltr">{timeLabel(log.performedAt)}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
