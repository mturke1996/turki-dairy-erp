'use client';

import { AlertTriangle, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const AR_WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

function greetingFor(hour: number): string {
  if (hour >= 4 && hour < 12) return 'صباح الخير';
  if (hour >= 12 && hour < 18) return 'مساء النور';
  return 'مساء الخير';
}

function alertsWord(n: number): string {
  if (n === 1) return 'تنبيه واحد';
  if (n === 2) return 'تنبيهان';
  if (n >= 3 && n <= 10) return `${n} تنبيهات`;
  return `${n} تنبيهاً`;
}

function fmtDate(d: Date): string {
  return `${AR_WEEKDAYS[d.getDay()]} ${d.getDate()} ${AR_MONTHS[d.getMonth()]}`;
}

export function WelcomeHero({
  userName,
  roleLabel,
  sessionLabel,
  alertsCount,
  actions,
}: {
  userName: string;
  roleLabel: string;
  sessionLabel: string;
  alertsCount: number;
  netPositive?: boolean;
  actions?: React.ReactNode;
}) {
  // تُصيَّر اللوحة بعد الـ hydration فقط، لذا قراءة الوقت مباشرة آمنة.
  const now = new Date();
  const firstName = userName.trim().split(/\s+/)[0] || userName;
  const hasAlerts = alertsCount > 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-whisper">
      <div className="p-4 sm:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[11.5px] font-medium text-muted-foreground sm:text-[12px]">
            {fmtDate(now)} · {sessionLabel}
          </p>
          <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">{roleLabel}</span>
        </div>

        <h1 className="mt-1.5 text-[22px] font-bold leading-tight tracking-tight text-foreground sm:text-[28px]">
          {greetingFor(now.getHours())}، {firstName}
        </h1>

        {hasAlerts ? (
          <a
            href="#alerts"
            className="mt-2.5 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-sun-50 px-2.5 py-1.5 text-[12px] font-semibold text-sun-800 ring-1 ring-sun-200 transition-colors hover:bg-sun-100 dark:bg-sun-500/10 dark:text-sun-300 dark:ring-sun-500/20"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{alertsWord(alertsCount)} بانتظار المراجعة</span>
            <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
          </a>
        ) : (
          <p className="mt-1.5 text-[12.5px] text-muted-foreground">لا توجد تنبيهات — العمل يسير بشكل طبيعي.</p>
        )}

        {actions ? (
          <div className={cn('mt-4 flex items-center gap-2', '[&>*]:flex-1 sm:[&>*]:flex-none')}>
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
