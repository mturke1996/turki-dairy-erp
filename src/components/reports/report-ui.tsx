'use client';

import { cn, formatNumber } from '@/lib/utils';
import { Money } from '@/components/shared/money';
import { Badge } from '@/components/ui/badge';

/** صف RTL: التسمية يميناً (بداية القراءة) والمبلغ يساراً */
function ReportRow({ label, value, className }: { label: React.ReactNode; value: React.ReactNode; className?: string }) {
  return (
    <div dir="rtl" className={cn('flex items-center justify-between gap-3', className)}>
      <span className="min-w-0 flex-1 text-right">{label}</span>
      <span className="shrink-0 text-left tabular-nums">{value}</span>
    </div>
  );
}

/** صف قائمة دخل */
export function ReportPnlRow({
  label,
  value,
  negative,
  bold,
}: {
  label: string;
  value: number;
  negative?: boolean;
  bold?: boolean;
}) {
  return (
    <ReportRow
      className="border-b border-border py-2.5 text-[13px]"
      label={<span className="text-muted-foreground">{label}</span>}
      value={
        <Money
          value={value}
          className={cn(
            bold || negative ? 'font-semibold' : 'font-medium',
            negative && 'text-rose-600',
          )}
        />
      }
    />
  );
}

/** صف إجمالي في قائمة الدخل */
export function ReportPnlTotal({
  label,
  amount,
  sub,
  positive = true,
}: {
  label: string;
  amount: number;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <div
      dir="rtl"
      className={cn(
        'flex items-center justify-between gap-3 rounded-xl px-4 py-3 ring-1',
        positive ? 'bg-meadow-50 ring-meadow-100' : 'bg-rose-50 ring-rose-100',
      )}
    >
      <span className={cn('min-w-0 flex-1 text-right text-[14px] font-bold', positive ? 'text-meadow-800' : 'text-rose-700')}>
        {label}
      </span>
      <div className="shrink-0 text-left">
        <Money
          value={amount}
          className={cn('text-[17px] font-bold tabular-nums', positive ? 'text-meadow-800' : 'text-rose-700')}
        />
        {sub ? (
          <p className={cn('text-[11px]', positive ? 'text-meadow-700' : 'text-rose-600')}>{sub}</p>
        ) : null}
      </div>
    </div>
  );
}

/** بطاقة صف للجوال */
export function ReportMobileCard({
  title,
  badge,
  rows,
  className,
}: {
  title: string;
  badge?: React.ReactNode;
  rows: { label: string; value: React.ReactNode; highlight?: boolean }[];
  className?: string;
}) {
  return (
    <div dir="rtl" className={cn('rounded-xl border border-border bg-card p-3.5 shadow-whisper', className)}>
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-right text-[13.5px] font-semibold leading-snug text-foreground">{title}</p>
        {badge}
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <ReportRow
            key={`${r.label}-${i}`}
            className={cn('text-[12.5px]', r.highlight && '[&_span:last-child]:font-semibold [&_span:last-child]:text-foreground')}
            label={<span className="text-muted-foreground">{r.label}</span>}
            value={r.value}
          />
        ))}
      </div>
    </div>
  );
}

/** شريط نسبة لأعمار الديون */
export function ReportAgingBar({
  label,
  value,
  total,
  tone = 'navy',
}: {
  label: string;
  value: number;
  total: number;
  tone?: 'navy' | 'meadow' | 'sun' | 'rose';
}) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  const bar =
    tone === 'meadow'
      ? 'bg-meadow-500'
      : tone === 'sun'
        ? 'bg-sun-500'
        : tone === 'rose'
          ? 'bg-rose-500'
          : 'bg-navy-600';

  return (
    <div dir="rtl" className="rounded-xl border border-border bg-card p-3 shadow-whisper">
      <ReportRow
        className="mb-2 items-baseline text-[12px]"
        label={<span className="font-medium text-foreground">{label}</span>}
        value={<Money value={value} decimals={0} className="text-[13px] font-bold" />}
      />
      <div dir="rtl" className="h-1.5 overflow-hidden rounded-full bg-canvas-sunken">
        <div className={cn('h-full rounded-full transition-[width]', bar)} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-left text-[10.5px] text-muted-foreground tabular-nums">{formatNumber(pct, 1)}%</p>
    </div>
  );
}

export function ReportStatusBadge({
  children,
  variant = 'neutral',
}: {
  children: React.ReactNode;
  variant?: 'neutral' | 'success' | 'danger' | 'warning';
}) {
  return (
    <Badge variant={variant} className="shrink-0 text-[10px]">
      {children}
    </Badge>
  );
}
