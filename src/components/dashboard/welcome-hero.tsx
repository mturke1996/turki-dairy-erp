'use client';

import { useEffect, useState } from 'react';
import {
  Sunrise,
  Sun,
  Sunset,
  Moon,
  CalendarDays,
  Clock,
  ShieldCheck,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/utils';

const AR_WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

function greetingFor(hour: number): { text: string; icon: LucideIcon } {
  if (hour >= 4 && hour < 12) return { text: 'صباح الخير', icon: Sunrise };
  if (hour >= 12 && hour < 17) return { text: 'طاب نهارك', icon: Sun };
  if (hour >= 17 && hour < 21) return { text: 'مساء الخير', icon: Sunset };
  return { text: 'مساءٌ هادئ', icon: Moon };
}

function alertsWord(n: number): string {
  if (n === 1) return 'تنبيه واحد';
  if (n === 2) return 'تنبيهان';
  if (n >= 3 && n <= 10) return `${n} تنبيهات`;
  return `${n} تنبيهاً`;
}

function fmtTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDate(d: Date): string {
  return `${AR_WEEKDAYS[d.getDay()]}، ${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function WelcomeHero({
  userName,
  roleLabel,
  sessionLabel,
  alertsCount,
  netPositive,
  actions,
}: {
  userName: string;
  roleLabel: string;
  sessionLabel: string;
  alertsCount: number;
  netPositive: boolean;
  actions?: React.ReactNode;
}) {
  // البانر لا يُصيَّر إلا بعد اكتمال الـ hydration على العميل (يعرض التخطيط شاشة بداية قبلها)،
  // لذا تهيئة الوقت مباشرة آمنة دون أي تعارض hydration.
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const greeting = greetingFor(now.getHours());
  const GreetIcon = greeting.icon;
  const firstName = userName.trim().split(/\s+/).slice(0, 2).join(' ');

  const hasAlerts = alertsCount > 0;
  const StatusIcon = hasAlerts ? AlertTriangle : ShieldCheck;
  const statusText = hasAlerts
    ? `لديك ${alertsWord(alertsCount)} بحاجة إلى مراجعة`
    : netPositive
      ? 'كل المؤشرات مستقرة ومركزك المالي إيجابي اليوم.'
      : 'لا توجد تنبيهات في الوقت الحالي.';

  return (
    <section className="paper relative overflow-hidden rounded-3xl border border-meadow-200/50 shadow-whisper dark:border-border">
      {/* توهّجات لونية ناعمة منجرفة */}
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-meadow-300/25 blur-3xl animate-drift dark:bg-meadow-500/15" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-sun-200/30 blur-3xl animate-drift dark:bg-sun-500/10" style={{ animationDelay: '-6s' }} />
      {/* حرف الهوية كعلامة مائية خفيفة */}
      <span
        aria-hidden
        className="serif-display pointer-events-none absolute -bottom-10 left-6 hidden select-none text-[150px] leading-none text-meadow-900/[0.05] lg:block dark:text-white/[0.04]"
      >
        {BRAND.monogram}
      </span>

      <div className="relative p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {/* البداية: التحية */}
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground backdrop-blur-sm">
                <CalendarDays className="h-3.5 w-3.5 text-meadow-600 dark:text-meadow-400" />
                <span>{fmtDate(now)}</span>
                <span className="mx-0.5 h-3 w-px bg-border" />
                <Clock className="h-3.5 w-3.5" />
                <span dir="ltr" className="tabular">{fmtTime(now)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-2.5 py-1 text-[11.5px] font-semibold text-foreground backdrop-blur-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-meadow-600 dark:text-meadow-400" />
                {roleLabel}
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sun-100 to-meadow-100 text-meadow-700 ring-1 ring-meadow-200/70 dark:from-sun-500/15 dark:to-meadow-500/15 dark:text-meadow-300 dark:ring-meadow-500/20">
                <GreetIcon className="h-6 w-6 stroke-[1.7]" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-[24px] font-bold leading-tight tracking-tight text-foreground sm:text-[30px]">
                  {greeting.text}، <span className="text-meadow-700 dark:text-meadow-400">{firstName}</span>
                </h1>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground sm:text-[13.5px]">
                  أهلاً بك في لوحة تحكم {BRAND.name} · نظرة لحظية على {sessionLabel}
                </p>
              </div>
            </div>

            <a
              href={hasAlerts ? '#alerts' : undefined}
              className={cn(
                'inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-semibold ring-1 transition-colors',
                hasAlerts
                  ? 'bg-sun-50 text-sun-800 ring-sun-200 hover:bg-sun-100 dark:bg-sun-500/10 dark:text-sun-300 dark:ring-sun-500/20'
                  : 'bg-meadow-50 text-meadow-800 ring-meadow-100 dark:bg-meadow-500/10 dark:text-meadow-300 dark:ring-meadow-500/20',
                !hasAlerts && 'pointer-events-none',
              )}
            >
              <StatusIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{statusText}</span>
            </a>
          </div>

          {/* النهاية: الإجراءات السريعة */}
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-stretch">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
