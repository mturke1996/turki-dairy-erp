'use client';

import { Calendar, Users, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/shared/money';
import { PAYROLL_STATUS_LABELS } from '@/lib/domain/constants';
import type { PayrollBatch } from '@/lib/domain/types';
import { cn, formatShortDate } from '@/lib/utils';

const STATUS_VARIANT: Record<PayrollBatch['status'], 'neutral' | 'info' | 'success'> = {
  draft: 'neutral',
  approved: 'info',
  paid: 'success',
};

const STATUS_STRIPE: Record<PayrollBatch['status'], string> = {
  draft: 'bg-muted-foreground/40',
  approved: 'bg-navy-400',
  paid: 'bg-meadow-500',
};

export function PayrollBatchCard({
  batch,
  canPay,
  onPay,
  pdfAction,
  className,
}: {
  batch: PayrollBatch;
  canPay: boolean;
  onPay: () => void;
  pdfAction: React.ReactNode;
  className?: string;
}) {
  const isPaid = batch.status === 'paid';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border bg-card shadow-whisper',
        className,
      )}
    >
      <div className={cn('absolute inset-y-0 start-0 w-1', STATUS_STRIPE[batch.status])} aria-hidden />

      <div className="p-4 ps-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-foreground">{batch.label}</p>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground" dir="ltr">{batch.ref}</p>
          </div>
          <Badge variant={STATUS_VARIANT[batch.status]} className="shrink-0">
            {PAYROLL_STATUS_LABELS[batch.status]}
          </Badge>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1" dir="ltr">
            <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" />
            {formatShortDate(batch.periodFrom)} — {formatShortDate(batch.periodTo)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5 shrink-0 opacity-70" />
            {batch.lines.length} موظف
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3 rounded-lg bg-canvas-sunken/60 px-3 py-2.5">
          <div>
            <p className="text-[10.5px] font-medium text-muted-foreground">إجمالي الكشف</p>
            <Money value={batch.totalAmount} decimals={0} className="mt-0.5 text-[18px] font-bold" />
          </div>
          {isPaid && batch.paidAt ? (
            <p className="text-[10.5px] text-muted-foreground" dir="ltr">
              صُرف {formatShortDate(batch.paidAt)}
            </p>
          ) : null}
        </div>

        <div className="mt-3 flex gap-2">
          <div className="shrink-0">{pdfAction}</div>
          {!isPaid ? (
            <Button size="sm" variant="outline" className="min-h-9 flex-1" disabled={!canPay} onClick={onPay}>
              <Wallet className="h-3.5 w-3.5" />
              صرف الرواتب
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
