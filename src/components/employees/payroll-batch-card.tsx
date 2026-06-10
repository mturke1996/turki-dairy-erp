'use client';

import { Calendar, Gift, HandCoins, Landmark, Pencil, Users, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/shared/money';
import { PAYROLL_STATUS_LABELS, PAYROLL_TYPE_LABELS } from '@/lib/domain/constants';
import {
  payoutSourceLabel,
  payrollBatchAdvanceDeducted,
  payrollBatchBonusTotal,
  payrollBatchCarriedForward,
  payrollBatchGrossTotal,
} from '@/lib/domain/payroll';
import type { BankAccount, CashVault, PayrollBatch } from '@/lib/domain/types';
import { cn, formatShortDate } from '@/lib/utils';

const STATUS_VARIANT: Record<PayrollBatch['status'], 'neutral' | 'info' | 'success'> = {
  draft: 'neutral',
  approved: 'info',
  paid: 'success',
};

export function PayrollBatchCard({
  batch,
  vaults,
  banks,
  canPay,
  onPay,
  onEdit,
  pdfAction,
  className,
}: {
  batch: PayrollBatch;
  vaults: CashVault[];
  banks: BankAccount[];
  canPay: boolean;
  onPay: () => void;
  onEdit?: () => void;
  pdfAction: React.ReactNode;
  className?: string;
}) {
  const isPaid = batch.status === 'paid';
  const grossTotal = payrollBatchGrossTotal(batch.lines);
  const bonusTotal = payrollBatchBonusTotal(batch.lines);
  const advanceDeducted = payrollBatchAdvanceDeducted(batch.lines);
  const carriedForward = payrollBatchCarriedForward(batch.lines);
  const withDebt = batch.lines.filter((l) => (l.debtBefore ?? 0) > 0).length;
  const withCarry = batch.lines.filter((l) => l.debtMode === 'carry_forward').length;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card shadow-whisper',
        isPaid && 'ring-1 ring-inset ring-meadow-200',
        className,
      )}
    >
      <div className="p-4">
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
          <span>{PAYROLL_TYPE_LABELS[batch.payrollType]}</span>
          {batch.paidFromType && batch.paidFromId ? (
            <span className="inline-flex max-w-[140px] items-center gap-1 truncate">
              <Landmark className="h-3.5 w-3.5 shrink-0 opacity-70" />
              {payoutSourceLabel(batch.paidFromType, batch.paidFromId, vaults, banks)}
            </span>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg bg-canvas-sunken/60 px-2.5 py-2">
            <p className="text-[10px] text-muted-foreground">إجمالي الأجور</p>
            <Money value={grossTotal} decimals={0} className="mt-0.5 text-[13px] font-semibold" />
          </div>
          {bonusTotal > 0 ? (
            <div className="rounded-lg border border-meadow-200/60 bg-meadow-50/40 px-2.5 py-2">
              <p className="text-[10px] text-meadow-800">
                <Gift className="mr-0.5 inline h-3 w-3" />
                مكافآت
              </p>
              <Money value={bonusTotal} decimals={0} className="mt-0.5 text-[13px] font-semibold text-meadow-800" />
            </div>
          ) : null}
          {advanceDeducted > 0 ? (
            <div className="rounded-lg border border-rose-200/60 bg-rose-50/40 px-2.5 py-2">
              <p className="text-[10px] text-rose-800">
                <HandCoins className="mr-0.5 inline h-3 w-3" />
                خصم دين
              </p>
              <Money value={advanceDeducted} decimals={0} className="mt-0.5 text-[13px] font-semibold text-rose-800" />
            </div>
          ) : null}
          {carriedForward > 0 ? (
            <div className="rounded-lg border border-amber-200/60 bg-amber-50/40 px-2.5 py-2">
              <p className="text-[10px] text-amber-800">مُرحَّل</p>
              <Money value={carriedForward} decimals={0} className="mt-0.5 text-[13px] font-semibold text-amber-800" />
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex items-end justify-between gap-3 rounded-lg border border-navy-200/50 bg-navy-50/30 px-3 py-2.5">
          <div>
            <p className="text-[10.5px] font-medium text-muted-foreground">صافي الصرف من الخزينة</p>
            <Money value={batch.totalAmount} decimals={0} className="mt-0.5 text-[18px] font-bold text-navy-900" />
            {withDebt > 0 ? (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {withDebt} موظف لديهم دين
                {withCarry > 0 ? ` · ${withCarry} بترحيل` : ''}
              </p>
            ) : null}
          </div>
          {isPaid && batch.paidAt ? (
            <p className="text-[10.5px] text-muted-foreground" dir="ltr">
              صُرف {formatShortDate(batch.paidAt)}
            </p>
          ) : null}
        </div>

        <div className="mt-3 flex gap-2">
          <div className="shrink-0">{pdfAction}</div>
          {onEdit ? (
            <Button size="sm" variant="outline" className="min-h-9" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              مراجعة
            </Button>
          ) : null}
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
