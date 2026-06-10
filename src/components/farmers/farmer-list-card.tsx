'use client';

import { ChevronLeft, Landmark, MapPin, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Money, Liters } from '@/components/shared/money';
import { FARMER_STATUS_LABELS, QUALITY_VARIANT } from '@/lib/domain/constants';
import type { FarmerStatus, QualityTier } from '@/lib/domain/types';
import { cn } from '@/lib/utils';

export type FarmerListItem = {
  id: string;
  fullName: string;
  code: string;
  region: string;
  phone: string;
  qualityTier: QualityTier;
  status: FarmerStatus;
  totalSupplied: number;
  creditBalance: number;
  bankName?: string;
  bankAccount?: string;
  iban?: string;
};

const STATUS_VARIANT = { active: 'success', suspended: 'warning', inactive: 'neutral' } as const;

function farmerInitial(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return parts[0].charAt(0) + parts[1].charAt(0);
  return name.charAt(0) || 'ف';
}

export function FarmerListCard({
  farmer,
  onClick,
  className,
}: {
  farmer: FarmerListItem;
  onClick: () => void;
  className?: string;
}) {
  const hasBank = Boolean(farmer.bankName || farmer.bankAccount || farmer.iban);
  const owes = farmer.creditBalance > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group w-full rounded-xl border border-border bg-card p-4 text-right shadow-whisper',
        'transition-[transform,background-color] active:scale-[0.99] active:bg-canvas-sunken/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[15px] font-bold ring-1',
            farmer.status === 'active'
              ? 'bg-meadow-50 text-meadow-800 ring-meadow-100'
              : farmer.status === 'suspended'
                ? 'bg-sun-50 text-sun-900 ring-sun-100'
                : 'bg-canvas-sunken text-muted-foreground ring-border',
          )}
          aria-hidden
        >
          {farmerInitial(farmer.fullName)}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold leading-snug text-foreground">{farmer.fullName}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-muted-foreground">
                <span className="font-mono tabular-nums" dir="ltr">{farmer.code}</span>
                {farmer.region ? (
                  <>
                    <span className="text-border">·</span>
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin className="h-3 w-3 shrink-0 opacity-60" />
                      {farmer.region}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
            <ChevronLeft className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50 transition group-hover:text-muted-foreground" />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <Badge variant={STATUS_VARIANT[farmer.status]} className="text-[10px]">
              {FARMER_STATUS_LABELS[farmer.status]}
            </Badge>
            <Badge variant={QUALITY_VARIANT[farmer.qualityTier]} className="text-[10px]">
              جودة {farmer.qualityTier}
            </Badge>
            {hasBank ? (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-navy-50 px-1.5 py-0.5 text-[10px] font-medium text-navy-700 ring-1 ring-navy-100">
                <Landmark className="h-3 w-3" />
                بنك
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-canvas-sunken/60 p-2.5">
        <div>
          <p className="text-[10.5px] font-medium text-muted-foreground">إجمالي الاستلام</p>
          <Liters value={farmer.totalSupplied} decimals={0} className="mt-0.5 text-[14px] font-semibold" />
        </div>
        <div className="border-s border-border/80 ps-2.5">
          <p className="text-[10.5px] font-medium text-muted-foreground">الدين</p>
          <Money
            value={farmer.creditBalance}
            decimals={0}
            className={cn('mt-0.5 text-[14px] font-bold', owes ? 'text-navy-700' : 'text-muted-foreground')}
          />
        </div>
      </div>

      {farmer.phone ? (
        <p className="mt-2 flex items-center justify-end gap-1 text-[11px] text-muted-foreground" dir="ltr">
          <Phone className="h-3 w-3 shrink-0" />
          {farmer.phone}
        </p>
      ) : null}
    </button>
  );
}

export function FarmerStatusChips({
  value,
  onChange,
  counts,
}: {
  value: 'all' | FarmerStatus;
  onChange: (v: 'all' | FarmerStatus) => void;
  counts: { all: number; active: number; suspended: number; inactive: number };
}) {
  const items: { key: 'all' | FarmerStatus; label: string; count: number }[] = [
    { key: 'all', label: 'الكل', count: counts.all },
    { key: 'active', label: FARMER_STATUS_LABELS.active, count: counts.active },
    { key: 'suspended', label: FARMER_STATUS_LABELS.suspended, count: counts.suspended },
    { key: 'inactive', label: FARMER_STATUS_LABELS.inactive, count: counts.inactive },
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
