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
  Filter,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AccessGate } from '@/components/shared/access-gate';
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
  auth: 'المصادقة',
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
  expense_category: 'تصنيفات المصاريف',
  income: 'الدخل',
  employee: 'الموظفون',
  payroll: 'الرواتب',
  settings: 'الإعدادات',
  report: 'التقارير',
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

function AuditPageContent() {
  const logs = useErpStore((s) => s.auditLogs);
  const [filter, setFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  const entityOptions = useMemo(() => {
    const types = new Set(logs.map((l) => l.entityType));
    return Array.from(types).sort((a, b) =>
      (ENTITY_LABELS[a] ?? a).localeCompare(ENTITY_LABELS[b] ?? b, 'ar'),
    );
  }, [logs]);

  const sorted = useMemo(() => {
    const list = [...logs].sort((a, b) => +new Date(b.performedAt) - +new Date(a.performedAt));
    const byAction = filter === 'all' ? list : list.filter((l) => l.action === filter);
    const byEntity =
      entityFilter === 'all' ? byAction : byAction.filter((l) => l.entityType === entityFilter);
    const q = query.trim().toLowerCase();
    if (!q) return byEntity;
    return byEntity.filter((l) =>
      [
        l.summary,
        l.performedBy,
        l.entityId,
        l.reason,
        ROLE_LABELS[l.performedByRole],
        AUDIT_ACTION_LABELS[l.action],
        ENTITY_LABELS[l.entityType] ?? l.entityType,
      ]
        .filter(Boolean)
        .some((part) => String(part).toLowerCase().includes(q)),
    );
  }, [logs, filter, entityFilter, query]);

  const stats = useMemo(() => {
    const today = logs.filter((l) => isToday(l.performedAt)).length;
    const writes = logs.filter((l) => ['create', 'update', 'delete'].includes(l.action)).length;
    const financial = logs.filter(
      (l) =>
        ['pay', 'transfer'].includes(l.action) ||
        ['expense', 'income', 'payment', 'transfer', 'vault', 'bank'].includes(l.entityType),
    ).length;
    const actors = new Set(logs.map((l) => l.performedBy)).size;
    return { total: logs.length, today, writes, financial, actors };
  }, [logs]);

  const grouped = useMemo(() => groupByDay(sorted), [sorted]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="النظام · مدير فقط"
        title="سجل النشاط"
        description="سجل تدقيق شامل: كل إضافة وتعديل وحذف ودخول وتصدير — يُحفظ في قاعدة البيانات ولا يُحذف تلقائياً."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <div className="relative sm:w-56">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث في النشاط..."
                className="pr-9"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="الإجراء" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الإجراءات</SelectItem>
                {(Object.keys(AUDIT_ACTION_LABELS) as AuditAction[]).map((a) => (
                  <SelectItem key={a} value={a}>
                    {AUDIT_ACTION_LABELS[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="النوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                {entityOptions.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ENTITY_LABELS[t] ?? t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-5">
        <ActivityStat icon={Activity} label="إجمالي النشاط" value={stats.total} hint="كل العمليات المسجلة" tone="meadow" />
        <ActivityStat icon={TimerReset} label="نشاط اليوم" value={stats.today} hint="منذ بداية اليوم" tone="sun" />
        <ActivityStat icon={Pencil} label="إنشاء وتعديل" value={stats.writes} hint="حركات تشغيلية" tone="navy" />
        <ActivityStat icon={ShieldCheck} label="نشاط مالي" value={stats.financial} hint="صرف، تحويل ودخل" tone="rose" />
        <ActivityStat icon={LogIn} label="المستخدمون" value={stats.actors} hint="من نفّذ عمليات" tone="navy" />
      </section>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border bg-canvas-sunken/45">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>الخط الزمني للنشاط</CardTitle>
              <CardDescription>
                {formatNumber(sorted.length)} نتيجة معروضة من أصل {formatNumber(logs.length)} حركة
              </CardDescription>
            </div>
            <Badge variant="success" className="h-7 px-2.5">
              حفظ تلقائي في PostgreSQL
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sorted.length === 0 ? (
            <EmptyState
              icon={History}
              title="لا توجد أحداث مطابقة"
              description="غيّر البحث أو التصفية — أو نفّذ عملية جديدة لتظهر هنا."
            />
          ) : (
            <div className="divide-y divide-border">
              {grouped.map(([day, items]) => (
                <section key={day} className="grid gap-0 lg:grid-cols-[150px_1fr]">
                  <div className="flex items-baseline gap-2 border-b border-border bg-canvas-sunken/40 px-4 py-2.5 sm:px-5 lg:block lg:border-b-0 lg:border-l lg:bg-card lg:py-4">
                    <p className="text-[12px] font-bold text-foreground">{day}</p>
                    <p className="text-[11px] text-muted-foreground lg:mt-0.5">{formatNumber(items.length)} حركة</p>
                  </div>
                  <ol
                    className="relative space-y-0.5 px-3 py-2.5 before:absolute before:right-[31px] before:bottom-5 before:top-5 before:w-px before:bg-border sm:space-y-1 sm:px-5 sm:py-3 sm:before:right-[39px]"
                    aria-label={`نشاط ${day}`}
                  >
                    {items.map((log) => {
                      const meta = ACTION_META[log.action];
                      const Icon = meta.icon;
                      return (
                        <li
                          key={log.id}
                          className="relative flex items-start gap-2.5 rounded-xl px-1 py-2 transition-colors hover:bg-canvas-sunken/65 sm:gap-3 sm:py-2.5"
                        >
                          <span
                            className={cn(
                              'z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 sm:h-10 sm:w-10',
                              meta.tone,
                            )}
                          >
                            <Icon className="h-4 w-4 stroke-[1.7] sm:h-4.5 sm:w-4.5" aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <p className="text-[12.5px] font-semibold leading-snug text-foreground sm:text-[13px]">
                                {log.summary}
                              </p>
                              <Badge variant="neutral" className="font-normal">
                                {AUDIT_ACTION_LABELS[log.action]}
                              </Badge>
                              <span className="rounded-full bg-canvas-sunken px-2 py-0.5 text-[10.5px] text-muted-foreground">
                                {ENTITY_LABELS[log.entityType] ?? log.entityType}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-[11.5px]">
                              {log.performedBy} · {ROLE_LABELS[log.performedByRole]}
                              {log.reason ? ` · السبب: ${log.reason}` : ''}
                            </p>
                            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/80" dir="ltr">
                              {log.entityId}
                            </p>
                          </div>
                          <time
                            className="shrink-0 pt-1 text-[10.5px] tabular text-muted-foreground sm:text-[11px]"
                            dateTime={log.performedAt}
                            dir="ltr"
                          >
                            {timeLabel(log.performedAt)}
                          </time>
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

export default function AuditPage() {
  return (
    <AccessGate permission="audit.view">
      <AuditPageContent />
    </AccessGate>
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
          <p className="mt-1 text-[22px] font-bold leading-none tracking-tight text-foreground sm:text-[28px]">
            {formatNumber(value)}
          </p>
        </div>
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 sm:h-10 sm:w-10 sm:rounded-xl',
            toneClass,
          )}
        >
          <Icon className="h-4.5 w-4.5 stroke-[1.7] sm:h-5 sm:w-5" aria-hidden />
        </span>
      </div>
      <p className="mt-2 truncate text-[10.5px] text-muted-foreground sm:mt-3 sm:text-[11.5px]">{hint}</p>
    </div>
  );
}
