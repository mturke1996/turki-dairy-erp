'use client';

import { AlertTriangle, ChevronLeft, Phone, Snowflake } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Money } from '@/components/shared/money';
import { CUSTOMER_TYPE_LABELS } from '@/lib/domain/constants';
import type { CustomerType } from '@/lib/domain/types';
import { cn, formatNumber } from '@/lib/utils';

export type CustomerListItem = {
  id: string;
  entityName: string;
  code: string;
  phone: string;
  entityType: CustomerType;
  totalRevenue: number;
  outstanding: number;
  overdueAmount: number;
  creditLimit: number;
  creditUtilization: number;
  onHold: boolean;
};

const TYPE_TONE: Record<CustomerType, string> = {
  factory: 'bg-navy-50 text-navy-800 ring-navy-100',
  distributor: 'bg-meadow-50 text-meadow-800 ring-meadow-100',
  retailer: 'bg-sun-50 text-sun-900 ring-sun-100',
  individual: 'bg-canvas-sunken text-muted-foreground ring-border',
};

function customerInitial(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return parts[0].charAt(0) + parts[1].charAt(0);
  return name.charAt(0) || 'ع';
}

function customerStatus(c: CustomerListItem): {
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'neutral';
  accent?: string;
} {
  if (c.onHold) return { label: 'مجمّد', variant: 'danger', accent: 'border-s-rose-400' };
  const overLimit = c.creditLimit > 0 && c.outstanding > c.creditLimit;
  if (overLimit) return { label: 'تجاوز الحد', variant: 'warning', accent: 'border-s-sun-400' };
  if (c.overdueAmount > 0) return { label: 'متأخر', variant: 'warning', accent: 'border-s-rose-300' };
  return { label: 'نشط', variant: 'success', accent: 'border-s-meadow-400' };
}

export function CustomerListCard({
  customer,
  onClick,
  className,
}: {
  customer: CustomerListItem;
  onClick: () => void;
  className?: string;
}) {
  const status = customerStatus(customer);
  const hasDebt = customer.outstanding > 0;
  const overLimit = customer.creditLimit > 0 && customer.outstanding > customer.creditLimit;
  const utilPct = Math.min(100, Math.max(0, customer.creditUtilization));

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative w-full overflow-hidden rounded-xl border border-border bg-card p-4 text-right shadow-whisper',
        'transition-[transform,background-color] active:scale-[0.99] active:bg-canvas-sunken/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        status.accent && `border-s-[3px] ${status.accent}`,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[15px] font-bold ring-1',
            TYPE_TONE[customer.entityType],
          )}
          aria-hidden
        >
          {customerInitial(customer.entityName)}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold leading-snug text-foreground">{customer.entityName}</p>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                <span className="font-mono tabular-nums" dir="ltr">{customer.code}</span>
                <span className="text-border"> · </span>
                {CUSTOMER_TYPE_LABELS[customer.entityType]}
              </p>
            </div>
            <ChevronLeft className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50 transition group-hover:text-muted-foreground" />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <Badge variant={status.variant} className="text-[10px]">
              {status.label}
            </Badge>
            {customer.overdueAmount > 0 ? (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-rose-100">
                <AlertTriangle className="h-3 w-3" />
                متأخر
              </span>
            ) : null}
            {customer.onHold ? (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-rose-100">
                <Snowflake className="h-3 w-3" />
                مجمّد
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-canvas-sunken/60 p-2.5">
        <div>
          <p className="text-[10.5px] font-medium text-muted-foreground">إجمالي المبيعات</p>
          <Money value={customer.totalRevenue} decimals={0} className="mt-0.5 text-[14px] font-semibold" />
        </div>
        <div className="border-s border-border/80 ps-2.5">
          <p className="text-[10.5px] font-medium text-muted-foreground">الدين</p>
          <Money
            value={customer.outstanding}
            decimals={0}
            className={cn(
              'mt-0.5 text-[14px] font-bold',
              customer.overdueAmount > 0 ? 'text-rose-700' : hasDebt ? 'text-navy-700' : 'text-muted-foreground',
            )}
          />
        </div>
      </div>

      {customer.creditLimit > 0 ? (
        <div className="mt-2.5 space-y-1">
          <div className="flex items-center justify-between text-[10.5px]">
            <span className="text-muted-foreground">استخدام الائتمان</span>
            <span
              className={cn('font-semibold tabular-nums', overLimit ? 'text-rose-600' : 'text-muted-foreground')}
              dir="ltr"
            >
              {formatNumber(utilPct, 0)}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border/80">
            <div
              className={cn(
                'h-full rounded-full transition-[width]',
                overLimit ? 'bg-rose-500' : utilPct >= 80 ? 'bg-sun-500' : 'bg-meadow-500',
              )}
              style={{ width: `${utilPct}%` }}
            />
          </div>
        </div>
      ) : null}

      {customer.phone ? (
        <p className="mt-2 flex items-center justify-end gap-1 text-[11px] text-muted-foreground" dir="ltr">
          <Phone className="h-3 w-3 shrink-0" />
          {customer.phone}
        </p>
      ) : null}
    </button>
  );
}

export type CustomerQuickFilter = 'all' | 'overdue' | 'on_hold' | 'active';

export function CustomerQuickChips({
  value,
  onChange,
  counts,
}: {
  value: CustomerQuickFilter;
  onChange: (v: CustomerQuickFilter) => void;
  counts: { all: number; overdue: number; on_hold: number; active: number };
}) {
  const items: { key: CustomerQuickFilter; label: string; count: number }[] = [
    { key: 'all', label: 'الكل', count: counts.all },
    { key: 'active', label: 'نشط', count: counts.active },
    { key: 'overdue', label: 'متأخر', count: counts.overdue },
    { key: 'on_hold', label: 'مجمّد', count: counts.on_hold },
  ];

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar md:hidden">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={cn(
            'shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors',
            value === item.key
              ? 'bg-navy-700 text-white shadow-whisper'
              : 'bg-canvas-sunken text-muted-foreground ring-1 ring-border hover:text-foreground',
          )}
        >
          {item.label}
          <span className={cn('ms-1.5 tabular-nums', value === item.key ? 'text-white/80' : 'text-muted-foreground/80')}>
            {item.count}
          </span>
        </button>
      ))}
    </div>
  );
}

export function CustomerTypeChips({
  value,
  onChange,
  counts,
}: {
  value: 'all' | CustomerType;
  onChange: (v: 'all' | CustomerType) => void;
  counts: Record<'all' | CustomerType, number>;
}) {
  const types = Object.keys(CUSTOMER_TYPE_LABELS) as CustomerType[];
  const items: { key: 'all' | CustomerType; label: string; count: number }[] = [
    { key: 'all', label: 'كل الأنواع', count: counts.all },
    ...types.map((k) => ({ key: k, label: CUSTOMER_TYPE_LABELS[k], count: counts[k] })),
  ];

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar md:hidden">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={cn(
            'shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors',
            value === item.key
              ? 'bg-meadow-700 text-white shadow-whisper'
              : 'bg-canvas-sunken text-muted-foreground ring-1 ring-border hover:text-foreground',
          )}
        >
          {item.label}
          <span className={cn('ms-1.5 tabular-nums', value === item.key ? 'text-white/80' : 'text-muted-foreground/80')}>
            {item.count}
          </span>
        </button>
      ))}
    </div>
  );
}
