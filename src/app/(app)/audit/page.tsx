'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  History,
  Plus,
  Pencil,
  Trash2,
  LogIn,
  Download,
  Lock,
  ArrowLeftRight,
  Wallet,
  Search,
  ShieldCheck,
  TimerReset,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useErpStore } from '@/lib/store/use-erp-store';
import { AUDIT_ACTION_LABELS, ROLE_LABELS } from '@/lib/domain/constants';
import type { AuditAction, AuditLog } from '@/lib/domain/types';
import { cn, formatNumber } from '@/lib/utils';

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

const ENTITY_LABELS: Record<string, string> = {
  session: 'الدورات',
  farmer: 'الفلاحون',
  customer: 'العملاء',
  supply: 'الاستلام',
  sale: 'المبيعات',
  payment: 'المدفوعات',
  debt: 'الديون',
  adjustment: 'المخزون',
  vault: 'الخزائن',
  bank: 'البنوك',
  transfer: 'التحويلات',
  expense: 'المصاريف',
  income: 'الدخل',
  employee: 'الموظفون',
  payroll: 'الرواتب',
  settings: 'الإعدادات',
};

function timeLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'غير معروف';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return 'اليوم';
  if (sameDay(d, yesterday)) return 'أمس';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const today = new Date();
  return (
    !Number.isNaN(d.getTime()) &&
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

function groupByDay(logs: AuditLog[]) {
  const groups = new Map<string, AuditLog[]>();
  for (const log of logs) {
    const key = dayKey(log.performedAt);
    groups.set(key, [...(groups.get(key) ?? []), log]);
  }
  return Array.from(groups.entries());
}

export default function AuditPage() {
  const logs = useErpStore((s) => s.auditLogs);
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  const sorted = useMemo(() => {
    const list = [...logs].sort((a, b) => +new Date(b.performedAt) - +new Date(a.performedAt));
    const byAction = filter === 'all' ? list : list.filter((l) => l.action === filter);
    const q = query.trim().toLowerCase();
    if (!q) return byAction;
    return byAction.filter((l) =>
      [l.summary, l.performedBy, ROLE_LABELS[l.performedByRole], AUDIT_ACTION_LABELS[l.action], ENTITY_LABELS[l.entityType] ?? l.entityType]
        .filter(Boolean)
        .some((part) => part.toLowerCase().includes(q)),
    );
  }, [logs, filter, query]);

  const stats = useMemo(() => {
    const today = logs.filter((l) => isToday(l.performedAt)).length;
    const writes = logs.filter((l) => ['create', 'update', 'delete'].includes(l.action)).length;
    const financial = logs.filter((l) => ['pay', 'transfer'].includes(l.action) || ['expense', 'income', 'payment', 'transfer'].includes(l.entityType)).length;
    return { total: logs.length, today, writes, financial };
  }, [logs]);

  const grouped = useMemo(() => groupByDay(sorted), [sorted]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="النظام"
        title="سجل النشاط"
        description="كل حركة في المصنع موثقة هنا: استلام، بيع، ديون، خزائن، مصاريف، رواتب وتعديلات."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث في النشاط..."
                className="pr-9"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الإجراءات</SelectItem>
                {(Object.keys(AUDIT_ACTION_LABELS) as AuditAction[]).map((a) => (
                  <SelectItem key={a} value={a}>{AUDIT_ACTION_LABELS[a]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <ActivityStat icon={Activity} label="إجمالي النشاط" value={stats.total} hint="كل العمليات المسجلة" tone="meadow" />
        <ActivityStat icon={TimerReset} label="نشاط اليوم" value={stats.today} hint="منذ بداية اليوم" tone="sun" />
        <ActivityStat icon={Pencil} label="إنشاء وتعديل" value={stats.writes} hint="حركات تشغيلية" tone="navy" />
        <ActivityStat icon={ShieldCheck} label="نشاط مالي" value={stats.financial} hint="صرف، تحويل ودخل" tone="rose" />
      </section>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border bg-canvas-sunken/45">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>الخط الزمني للنشاط</CardTitle>
              <CardDescription>{formatNumber(sorted.length)} نتيجة معروضة من أصل {formatNumber(logs.length)} حركة</CardDescription>
            </div>
            <Badge variant="neutral" className="h-7 px-2.5">تسجيل تلقائي</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sorted.length === 0 ? (
            <EmptyState icon={History} title="لا توجد أحداث مطابقة" description="غيّر البحث أو التصفية لرؤية نشاط آخر." />
          ) : (
            <div className="divide-y divide-border">
              {grouped.map(([day, items]) => (
                <section key={day} className="grid gap-0 lg:grid-cols-[150px_1fr]">
                  <div className="flex items-baseline gap-2 border-b border-border bg-canvas-sunken/40 px-4 py-2.5 sm:px-5 lg:block lg:border-b-0 lg:border-l lg:bg-card lg:py-4">
                    <p className="text-[12px] font-bold text-foreground">{day}</p>
                    <p className="text-[11px] text-muted-foreground lg:mt-0.5">{formatNumber(items.length)} حركة</p>
                  </div>
                  <ol className="relative space-y-0.5 px-3 py-2.5 before:absolute before:right-[31px] before:bottom-5 before:top-5 before:w-px before:bg-border sm:space-y-1 sm:px-5 sm:py-3 sm:before:right-[39px]">
                    {items.map((log) => {
                      const meta = ACTION_META[log.action];
                      const Icon = meta.icon;
                      return (
                        <li key={log.id} className="relative flex items-start gap-2.5 rounded-xl px-1 py-2 transition-colors hover:bg-canvas-sunken/65 sm:gap-3 sm:py-2.5">
                          <span className={cn('z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 sm:h-10 sm:w-10', meta.tone)}>
                            <Icon className="h-4 w-4 stroke-[1.7] sm:h-4.5 sm:w-4.5" />
                          </span>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <p className="text-[12.5px] font-semibold leading-snug text-foreground sm:text-[13px]">{log.summary}</p>
                              <Badge variant="neutral" className="hidden font-normal sm:inline-flex">{AUDIT_ACTION_LABELS[log.action]}</Badge>
                              <span className="hidden rounded-full bg-canvas-sunken px-2 py-0.5 text-[10.5px] text-muted-foreground sm:inline">
                                {ENTITY_LABELS[log.entityType] ?? log.entityType}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-[11.5px]">
                              {ENTITY_LABELS[log.entityType] ?? log.entityType} · {log.performedBy}
                              <span className="hidden sm:inline"> · {ROLE_LABELS[log.performedByRole]}</span>
                              {log.reason ? ` · السبب: ${log.reason}` : ''}
                            </p>
                          </div>
                          <span className="shrink-0 pt-1 text-[10.5px] tabular text-muted-foreground sm:text-[11px]" dir="ltr">{timeLabel(log.performedAt)}</span>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityStat({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
  tone: 'meadow' | 'sun' | 'navy' | 'rose';
}) {
  const toneClass = {
    meadow: 'bg-meadow-50 text-meadow-800 ring-meadow-100',
    sun: 'bg-sun-50 text-sun-800 ring-sun-100',
    navy: 'bg-navy-50 text-navy-800 ring-navy-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  }[tone];

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 shadow-whisper sm:rounded-2xl sm:p-4">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11.5px] font-medium text-muted-foreground sm:text-[12px]">{label}</p>
          <p className="mt-1 text-[22px] font-bold leading-none tracking-tight text-foreground sm:text-[28px]">{formatNumber(value)}</p>
        </div>
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 sm:h-10 sm:w-10 sm:rounded-xl', toneClass)}>
          <Icon className="h-4.5 w-4.5 stroke-[1.7] sm:h-5 sm:w-5" />
        </span>
      </div>
      <p className="mt-2 truncate text-[10.5px] text-muted-foreground sm:mt-3 sm:text-[11.5px]">{hint}</p>
    </div>
  );
}
