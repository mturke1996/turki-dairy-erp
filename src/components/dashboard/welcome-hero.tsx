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
    <section className="overflow-hidden rounded-xl border border-border bg-card lg:rounded-2xl">
      <div className="p-3.5 sm:p-5 lg:p-6">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[11px] font-medium text-muted-foreground sm:text-[12px]">
            {fmtDate(now)} · {sessionLabel}
          </p>
          <span className="shrink-0 text-[10.5px] font-semibold text-muted-foreground sm:text-[11px]">{roleLabel}</span>
        </div>

        <h1 className="mt-1 text-[20px] font-bold leading-tight tracking-tight text-foreground sm:text-[26px] lg:text-[28px]">
          {greetingFor(now.getHours())}، {firstName}
        </h1>

        {hasAlerts ? (
          <a
            href="#alerts"
            className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-sun-50 px-2 py-1.5 text-[11.5px] font-semibold text-sun-800 ring-1 ring-sun-200 transition-colors active:bg-sun-100 sm:mt-2.5 sm:px-2.5 sm:text-[12px]"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{alertsWord(alertsCount)}</span>
            <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
          </a>
        ) : (
          <p className="mt-1.5 text-[11.5px] text-muted-foreground sm:text-[12.5px]">لا تنبيهات — العمل طبيعي.</p>
        )}

        {actions ? (
          <div className={cn('mt-3 flex items-center gap-2 sm:mt-4', '[&_a]:h-10 [&_a]:flex-1 [&_a]:text-[13px] sm:[&_a]:flex-none sm:[&_a]:h-9')}>
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
