'use client';

import { Calendar, ChevronLeft, Users, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/shared/money';
import { PAYROLL_STATUS_LABELS, PAYROLL_TYPE_LABELS } from '@/lib/domain/constants';
import {
  payrollBatchIsPartial,
  payrollBatchPaidCashTotal,
  payrollBatchProgress,
  payrollBatchRemainingSummary,
  payrollBatchTotal,
} from '@/lib/domain/payroll';
import type { BankAccount, CashVault, PayrollBatch } from '@/lib/domain/types';
import { cn, formatShortDate } from '@/lib/utils';

function batchStatusVariant(batch: PayrollBatch): 'neutral' | 'info' | 'success' {
  if (batch.status === 'paid') return 'success';
  if (payrollBatchIsPartial(batch) || batch.status === 'approved') return 'info';
  return 'neutral';
}

function batchStatusLabel(batch: PayrollBatch): string {
  if (batch.status === 'paid') return PAYROLL_STATUS_LABELS.paid;
  if (payrollBatchIsPartial(batch)) return PAYROLL_STATUS_LABELS.approved;
  return PAYROLL_STATUS_LABELS[batch.status];
}

export function PayrollBatchCard({
  batch,
  vaults: _vaults,
  banks: _banks,
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
  void _vaults;
  void _banks;
  const isPaid = batch.status === 'paid';
  const isPartial = payrollBatchIsPartial(batch);
  const progress = payrollBatchProgress(batch);
  const remaining = payrollBatchTotal(batch.lines, batch.status);
  const paidCash = payrollBatchPaidCashTotal(batch.lines, batch.status);
  const summary = payrollBatchRemainingSummary(batch.lines, batch.status);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card shadow-whisper',
        isPaid && 'border-meadow-200/70',
        isPartial && 'border-sky-200/70',
        className,
      )}
    >
      <button
        type="button"
        onClick={onEdit}
        className="group w-full p-3.5 text-right transition-colors hover:bg-canvas-sunken/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="flex items-start gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-semibold text-foreground">{batch.label}</p>
              <Badge variant={batchStatusVariant(batch)} className="text-[10px]">
                {batchStatusLabel(batch)}
              </Badge>
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground" dir="ltr">{batch.ref}</p>
            <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1" dir="ltr">
                <Calendar className="size-3 opacity-60" />
                {formatShortDate(batch.periodFrom)} — {formatShortDate(batch.periodTo)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="size-3 opacity-60" />
                {batch.lines.length} موظف
              </span>
              <span>{PAYROLL_TYPE_LABELS[batch.payrollType]}</span>
            </div>
          </div>
          <ChevronLeft className="mt-0.5 size-4 shrink-0 text-muted-foreground/40" />
        </div>

        {!isPaid && progress.total > 0 ? (
          <div className="mt-3" role="status" aria-label={`صُرف ${progress.paid} من ${progress.total}`}>
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">تقدّم الصرف</span>
              <span className="font-medium tabular-nums">{progress.paid}/{progress.total}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-canvas-sunken">
              <div
                className="h-full rounded-full bg-meadow-500 transition-[width] duration-200 ease-out motion-reduce:transition-none"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="mt-3 rounded-lg bg-navy-50/50 px-3 py-2.5 text-right">
          <p className="text-[11px] text-muted-foreground">
            {isPaid ? 'إجمالي المُصروف من الخزينة' : remaining > 0 ? 'صافي المتبقي من الخزينة' : 'مكتمل'}
          </p>
          <Money
            value={isPaid ? paidCash : remaining}
            decimals={0}
            className="mt-0.5 block text-xl font-semibold tabular-nums text-navy-900"
          />
          {!isPaid && remaining > 0 ? (
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              أجور{' '}
              <Money value={summary.grossWithBonus} decimals={0} className="inline font-medium text-foreground" />
              {summary.deducted > 0 ? (
                <>
                  {' '}
                  − دين{' '}
                  <Money value={summary.deducted} decimals={0} className="inline font-medium text-rose-700" />
                </>
              ) : null}
              {summary.carried > 0 ? (
                <span className="block text-amber-800">
                  يُرحَّل{' '}
                  <Money value={summary.carried} decimals={0} className="inline font-medium" />
                  {' '}
                  (يُصرف الأجر كاملاً)
                </span>
              ) : null}
            </p>
          ) : null}
          {!isPaid && batch.payrollType === 'all' ? (
            <p className="mt-1 text-[10.5px] text-muted-foreground">
              كشف «الكل» — حسب نوع كل موظف وأيام الفترة
            </p>
          ) : null}
          {!isPaid && batch.payrollType === 'bi_monthly' ? (
            <p className="mt-1 text-[10.5px] text-muted-foreground">
              كشف نصف شهر — نصف شهر كاملاً، شهري بنصف الراتب
            </p>
          ) : null}
          {!isPaid && paidCash > 0 ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              صُرف سابقاً{' '}
              <Money value={paidCash} decimals={0} className="inline font-medium text-foreground" />
            </p>
          ) : null}
        </div>
      </button>

      <div className="flex flex-wrap gap-2 border-t border-border/80 px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0">{pdfAction}</div>
        {!isPaid && remaining > 0 && onEdit ? (
          <Button variant="outline" size="sm" className="min-w-0 flex-1" onClick={onEdit}>
            مراجعة
          </Button>
        ) : null}
        {!isPaid && remaining > 0 ? (
          <Button size="sm" className="min-w-0 flex-1" disabled={!canPay} onClick={onPay}>
            <Wallet className="size-3.5" />
            صرف الكل
          </Button>
        ) : null}
      </div>
    </div>
  );
}
