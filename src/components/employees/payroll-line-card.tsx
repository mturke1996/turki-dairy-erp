'use client';

import {
  ArrowRightLeft,
  CheckCircle2,
  ChevronDown,
  Gift,
  HandCoins,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Money, moneyText } from '@/components/shared/money';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PAYROLL_DEBT_MODE_LABELS } from '@/lib/domain/constants';
import { isPayrollLinePaid, payoutSourceLabel } from '@/lib/domain/payroll';
import type {
  BankAccount,
  CashVault,
  Employee,
  PayrollDebtMode,
  PayrollLine,
} from '@/lib/domain/types';
import { cn, formatShortDate } from '@/lib/utils';

function employeeInitial(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return parts[0].charAt(0) + parts[1].charAt(0);
  return name.charAt(0) || 'م';
}

export function PayrollLineCard({
  employee,
  line,
  batchStatus,
  draft,
  isEditable,
  canPay,
  vaults,
  banks,
  onDraftChange,
  onPay,
  className,
}: {
  employee?: Employee;
  line: PayrollLine;
  batchStatus: 'draft' | 'approved' | 'paid';
  draft?: { bonusAmount: number; debtMode: PayrollDebtMode };
  isEditable: boolean;
  canPay: boolean;
  vaults: CashVault[];
  banks: BankAccount[];
  onDraftChange?: (patch: Partial<{ bonusAmount: number; debtMode: PayrollDebtMode }>) => void;
  onPay?: () => void;
  className?: string;
}) {
  const paid = isPayrollLinePaid(line, batchStatus);
  const grossWithBonus = line.grossSalary + line.bonusAmount;
  const name = employee?.fullName ?? 'موظف';
  const showEdit = isEditable && !paid;

  return (
    <article
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card shadow-whisper',
        paid && 'border-meadow-200/80',
        className,
      )}
    >
      <div className="p-3.5 sm:p-4">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold',
              paid ? 'bg-meadow-100 text-meadow-800' : 'bg-navy-50 text-navy-800',
            )}
            aria-hidden
          >
            {paid ? <CheckCircle2 className="size-4" strokeWidth={2.25} /> : employeeInitial(name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {line.attendanceDays} يوم
                  {line.absenceDays > 0 ? ` · غياب ${line.absenceDays}` : ''}
                  {employee?.jobTitle ? ` · ${employee.jobTitle}` : ''}
                </p>
              </div>
              {paid ? <Badge variant="success" className="shrink-0 text-[10px]">مُصروف</Badge> : null}
            </div>
          </div>
        </div>

        <div className={cn('mt-3 rounded-lg px-3 py-2.5', paid ? 'bg-meadow-50/60' : 'bg-navy-50/50')}>
          <p className="text-[11px] text-muted-foreground">{paid ? 'المبلغ المُصروف' : 'الصافي للصرف'}</p>
          <Money
            value={line.netSalary}
            decimals={0}
            className={cn(
              'mt-0.5 block text-xl font-semibold tabular-nums sm:text-2xl',
              paid ? 'text-meadow-900' : 'text-navy-900',
            )}
          />
          {paid && line.paidAt ? (
            <p className="mt-1.5 text-[11px] text-meadow-800">
              {formatShortDate(line.paidAt)}
              {line.paidFromType && line.paidFromId
                ? ` · ${payoutSourceLabel(line.paidFromType, line.paidFromId, vaults, banks)}`
                : ''}
            </p>
          ) : (
            <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-xs tabular-nums text-muted-foreground">
              <span>
                إجمالي{' '}
                <Money value={grossWithBonus} decimals={0} className="inline font-medium text-foreground" />
              </span>
              {line.debtBefore > 0 ? (
                <span className="text-rose-700">
                  دين <Money value={line.debtBefore} decimals={0} className="inline font-medium" />
                </span>
              ) : null}
            </div>
          )}
        </div>

        {!paid && line.debtBefore > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {line.advanceDeducted > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-800 ring-1 ring-rose-200/70">
                <HandCoins className="size-3" />
                خصم {moneyText(line.advanceDeducted, 0)}
              </span>
            ) : null}
            {line.debtCarriedForward > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900 ring-1 ring-amber-200/70">
                <ArrowRightLeft className="size-3" />
                يُرحَّل {moneyText(line.debtCarriedForward, 0)}
              </span>
            ) : null}
          </div>
        ) : null}

        {showEdit ? (
          <details className="group mt-2.5 overflow-hidden rounded-lg border border-border/80 bg-canvas-sunken/40">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-foreground [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1">
                <Gift className="size-3.5 text-muted-foreground" />
                مكافأة ومعالجة الدين
              </span>
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <div className="space-y-2.5 border-t border-border/60 px-3 pb-3 pt-2.5">
              <div>
                <label className="mb-1 block text-[11px] text-muted-foreground">مكافأة (د.ل)</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  dir="ltr"
                  value={draft?.bonusAmount || ''}
                  onChange={(e) =>
                    onDraftChange?.({ bonusAmount: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="h-9 text-left text-sm"
                  placeholder="0"
                />
              </div>
              {line.debtBefore > 0 ? (
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">معالجة الدين</label>
                  <Select
                    value={draft?.debtMode ?? line.debtMode}
                    onValueChange={(v) => onDraftChange?.({ debtMode: v as PayrollDebtMode })}
                  >
                    <SelectTrigger className="h-9 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PAYROLL_DEBT_MODE_LABELS) as PayrollDebtMode[]).map((m) => (
                        <SelectItem key={m} value={m} className="text-xs">
                          {PAYROLL_DEBT_MODE_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          </details>
        ) : null}

        {!paid && canPay && onPay ? (
          <Button size="sm" className="mt-3 w-full" onClick={onPay}>
            <Wallet className="size-3.5" />
            صرف {moneyText(line.netSalary, 0)}
          </Button>
        ) : null}
      </div>
    </article>
  );
}
