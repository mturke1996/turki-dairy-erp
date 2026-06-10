'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BadgeDollarSign, ChevronDown, Trash2, Users, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Money } from '@/components/shared/money';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PayrollLineCard } from '@/components/employees/payroll-line-card';
import {
  PayrollEmployeePayDialog,
  type PayrollEmployeePayTarget,
} from '@/components/employees/payroll-employee-pay-dialog';
import { PAYROLL_STATUS_LABELS, PAYROLL_TYPE_LABELS } from '@/lib/domain/constants';
import {
  isPayrollLinePaid,
  normalizePayrollLine,
  payrollBatchPaidCount,
  payrollBatchProgress,
  payrollBatchRemainingSummary,
  resolvePayrollLinePreview,
} from '@/lib/domain/payroll';
import type {
  BankAccount,
  CashMovement,
  CashVault,
  Employee,
  PayrollBatch,
  PayrollDebtMode,
} from '@/lib/domain/types';
import { cn, formatShortDate } from '@/lib/utils';

type LineDraft = {
  employeeId: string;
  bonusAmount: number;
  debtMode: PayrollDebtMode;
  notes: string;
};

type LineFilter = 'all' | 'pending' | 'paid';

const DIALOG_SHELL = cn(
  'flex flex-col gap-0 overflow-hidden p-0',
  'max-w-[100vw] w-[100vw] h-[100dvh] max-h-[100dvh] rounded-none border-0',
  'left-0 top-0 translate-x-0 translate-y-0',
  'sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[min(92dvh,760px)] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border lg:max-w-3xl',
);

export function PayrollBatchEditDialog({
  batch,
  employees,
  vaults,
  banks,
  cashMovements,
  advanceBalanceOf,
  open,
  onOpenChange,
  onSave,
  onPay,
  onPayEmployee,
  onDelete,
  canPay,
  canDelete,
}: {
  batch: PayrollBatch | null;
  employees: Employee[];
  vaults: CashVault[];
  banks: BankAccount[];
  cashMovements: CashMovement[];
  advanceBalanceOf: (employeeId: string) => number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    batchId: string,
    patches: Array<{
      employeeId: string;
      bonusAmount?: number;
      debtMode?: PayrollDebtMode;
      notes?: string;
    }>,
  ) => Promise<void>;
  onPay?: () => void;
  onPayEmployee: (
    batchId: string,
    employeeId: string,
    source: { type: import('@/lib/domain/types').AccountSourceType; id: string },
  ) => Promise<{ ok: boolean; error?: string }>;
  onDelete?: () => Promise<{ ok: boolean; error?: string }>;
  canPay: boolean;
  canDelete?: boolean;
}) {
  const [drafts, setDrafts] = useState<LineDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [payTarget, setPayTarget] = useState<PayrollEmployeePayTarget | null>(null);
  const [lineFilter, setLineFilter] = useState<LineFilter>('all');

  useEffect(() => {
    if (!batch || !open) return;
    setDrafts(
      batch.lines.map((l) => {
        const n = normalizePayrollLine(l);
        return {
          employeeId: l.employeeId,
          bonusAmount: n.bonusAmount,
          debtMode: n.debtMode,
          notes: n.notes ?? '',
        };
      }),
    );
    setPayTarget(null);
    setLineFilter('all');
  }, [batch, open]);

  const previewLines = useMemo(() => {
    if (!batch) return [];
    return drafts.map((d) => {
      const employee = employees.find((e) => e.id === d.employeeId);
      const existing = batch.lines.find((l) => l.employeeId === d.employeeId)!;
      if (!employee) return normalizePayrollLine(existing);
      return resolvePayrollLinePreview(
        existing,
        batch,
        employee,
        { bonusAmount: d.bonusAmount, debtMode: d.debtMode, notes: d.notes },
        advanceBalanceOf(d.employeeId),
      );
    });
  }, [batch, drafts, employees, advanceBalanceOf]);

  const totals = useMemo(() => {
    if (!batch) {
      return { grossWithBonus: 0, bonus: 0, deducted: 0, carried: 0, net: 0 };
    }
    const summary = payrollBatchRemainingSummary(previewLines, batch.status);
    return {
      grossWithBonus: summary.grossWithBonus,
      bonus: summary.bonus,
      deducted: summary.deducted,
      carried: summary.carried,
      net: summary.net,
    };
  }, [previewLines, batch]);

  if (!batch) return null;
  const activeBatch = batch;
  const isPaid = activeBatch.status === 'paid';
  const isEditable = !isPaid;
  const progress = payrollBatchProgress(activeBatch);
  const paidCount = payrollBatchPaidCount(activeBatch.lines, activeBatch.status);
  const unpaidCount = activeBatch.lines.length - paidCount;

  const filteredIndices = previewLines
    .map((line, i) => {
      const stored = normalizePayrollLine(
        activeBatch.lines.find((l) => l.employeeId === line.employeeId)!,
      );
      const linePaid = isPayrollLinePaid(stored, activeBatch.status);
      if (lineFilter === 'pending' && linePaid) return null;
      if (lineFilter === 'paid' && !linePaid) return null;
      return i;
    })
    .filter((i): i is number => i !== null);

  function updateDraft(employeeId: string, patch: Partial<LineDraft>) {
    setDrafts((prev) =>
      prev.map((d) => (d.employeeId === employeeId ? { ...d, ...patch } : d)),
    );
  }

  async function save() {
    setBusy(true);
    try {
      await onSave(
        activeBatch.id,
        drafts.map((d) => ({
          employeeId: d.employeeId,
          bonusAmount: d.bonusAmount,
          debtMode: d.debtMode,
          notes: d.notes || undefined,
        })),
      );
      toast.success('تم حفظ الكشف');
    } catch {
      toast.error('تعذّر الحفظ');
    } finally {
      setBusy(false);
    }
  }

  async function openEmployeePay(employeeId: string) {
    const employee = employees.find((e) => e.id === employeeId);
    const line = previewLines.find((l) => l.employeeId === employeeId);
    if (!employee || !line) return;
    if (isEditable) {
      setBusy(true);
      try {
        await onSave(activeBatch.id, drafts.map((d) => ({
          employeeId: d.employeeId,
          bonusAmount: d.bonusAmount,
          debtMode: d.debtMode,
          notes: d.notes || undefined,
        })));
      } catch {
        return;
      } finally {
        setBusy(false);
      }
    }
    setPayTarget({ batch: activeBatch, employee, line });
  }

  const filterTabs: { key: LineFilter; label: string; count: number }[] = [
    { key: 'all', label: 'الكل', count: activeBatch.lines.length },
    { key: 'pending', label: 'متبقّي', count: unpaidCount },
    { key: 'paid', label: 'مُصروف', count: paidCount },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={DIALOG_SHELL}>
          <div className="shrink-0 border-b border-border bg-navy-900 px-4 py-4 text-white sm:px-6">
            <DialogHeader className="space-y-1.5 text-right">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-[16px] leading-snug text-white sm:text-[17px]">
                  {activeBatch.label}
                </DialogTitle>
                <Badge variant={isPaid ? 'success' : progress.paid > 0 ? 'info' : 'neutral'} className="text-[10px]">
                  {isPaid
                    ? PAYROLL_STATUS_LABELS.paid
                    : progress.paid > 0
                      ? PAYROLL_STATUS_LABELS.approved
                      : PAYROLL_STATUS_LABELS.draft}
                </Badge>
              </div>
              <DialogDescription className="text-[11.5px] text-white/70 sm:text-[12.5px]">
                {PAYROLL_TYPE_LABELS[activeBatch.payrollType]}
                <span className="mx-1.5">·</span>
                {formatShortDate(activeBatch.periodFrom)} — {formatShortDate(activeBatch.periodTo)}
              </DialogDescription>
              {!isPaid && activeBatch.lines.length > 0 ? (
                <div className="pt-2" role="status" aria-live="polite">
                  <div className="flex items-center justify-between text-[10.5px] text-white/80">
                    <span>تقدّم الصرف</span>
                    <span className="tabular-nums">{progress.paid}/{progress.total}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-meadow-400 transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {/* ملخص — بطل على الجوال */}
            <div className="rounded-2xl bg-navy-50/50 px-4 py-3.5 ring-1 ring-navy-200/50">
              <p className="text-[11px] font-medium text-muted-foreground">
                {isPaid ? 'إجمالي المُصروف من الخزينة' : 'صافي المتبقي من الخزينة'}
              </p>
              <Money
                value={totals.net}
                decimals={0}
                className="mt-1 block text-xl font-semibold tabular-nums text-navy-900 sm:text-2xl"
              />
              {!isPaid && totals.net > 0 ? (
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  أجور{' '}
                  <Money value={totals.grossWithBonus} decimals={0} className="inline font-medium text-foreground" />
                  {totals.deducted > 0 ? (
                    <>
                      {' '}
                      − دين{' '}
                      <Money value={totals.deducted} decimals={0} className="inline font-medium text-rose-700" />
                    </>
                  ) : null}
                  {totals.carried > 0 ? (
                    <span className="block text-amber-800">
                      يُرحَّل{' '}
                      <Money value={totals.carried} decimals={0} className="inline font-medium" />
                      {' '}
                      (يُصرف الأجر كاملاً — الدين لا يُخصم الآن)
                    </span>
                  ) : null}
                </p>
              ) : null}
              {!isPaid && activeBatch.payrollType === 'all' ? (
                <p className="mt-1 text-[10.5px] text-muted-foreground">
                  كشف «الكل» — كل موظف يُحسب حسب نوع راتبه وأيام الفترة
                </p>
              ) : null}
              {!isPaid && activeBatch.payrollType === 'bi_monthly' ? (
                <p className="mt-1 text-[10.5px] text-muted-foreground">
                  كشف نصف شهر — موظفو «نصف شهر» كاملاً، الشهري بنصف الراتب
                </p>
              ) : null}
              <details className="group mt-3 sm:hidden">
                <summary className="flex cursor-pointer list-none items-center gap-1 text-[12px] font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
                  تفاصيل الملخص
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                  <div className="rounded-xl bg-card px-3 py-2 ring-1 ring-border/80">
                    <p className="text-[10px] text-muted-foreground">إجمالي المتبقي</p>
                    <Money value={totals.grossWithBonus} decimals={0} className="font-semibold" />
                  </div>
                  <div className="rounded-xl bg-card px-3 py-2 ring-1 ring-border/80">
                    <p className="text-[10px] text-muted-foreground">مكافآت</p>
                    <Money value={totals.bonus} decimals={0} className="font-semibold text-meadow-800" />
                  </div>
                  <div className="rounded-xl bg-card px-3 py-2 ring-1 ring-border/80">
                    <p className="text-[10px] text-muted-foreground">خصم دين</p>
                    <Money value={totals.deducted} decimals={0} className="font-semibold text-rose-800" />
                  </div>
                  <div className="rounded-xl bg-card px-3 py-2 ring-1 ring-border/80">
                    <p className="text-[10px] text-muted-foreground">مُرحَّل</p>
                    <Money value={totals.carried} decimals={0} className="font-semibold text-amber-900" />
                  </div>
                </div>
              </details>
              <div className="mt-3 hidden flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground sm:flex">
                <span>إجمالي المتبقي <Money value={totals.grossWithBonus} decimals={0} className="inline font-semibold text-foreground" /></span>
                {totals.bonus > 0 ? <span>مكافآت <Money value={totals.bonus} decimals={0} className="inline font-semibold text-meadow-800" /></span> : null}
                {totals.deducted > 0 ? <span>خصم <Money value={totals.deducted} decimals={0} className="inline font-semibold text-rose-800" /></span> : null}
                {totals.carried > 0 ? <span>مُرحَّل <Money value={totals.carried} decimals={0} className="inline font-semibold text-amber-900" /></span> : null}
              </div>
            </div>

            {/* فلتر الموظفين */}
            {activeBatch.lines.length > 1 ? (
              <div className="mt-4 flex gap-1.5 rounded-xl bg-canvas-sunken/50 p-1 ring-1 ring-border/80" role="tablist" aria-label="فلتر الموظفين">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={lineFilter === tab.key}
                    onClick={() => setLineFilter(tab.key)}
                    className={cn(
                      'flex h-9 flex-1 items-center justify-center gap-1 rounded-lg text-xs font-medium transition-colors',
                      lineFilter === tab.key
                        ? 'bg-card text-foreground shadow-whisper ring-1 ring-border'
                        : 'text-muted-foreground',
                    )}
                  >
                    {tab.label}
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] tabular-nums', lineFilter === tab.key ? 'bg-navy-50 text-navy-700' : 'opacity-70')}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {filteredIndices.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-muted-foreground" role="status">
                  لا يوجد موظفون في هذا الفلتر
                </p>
              ) : (
                filteredIndices.map((i) => {
                  const line = previewLines[i];
                  const emp = employees.find((e) => e.id === line.employeeId);
                  const draft = drafts.find((d) => d.employeeId === line.employeeId)!;
                  const stored = normalizePayrollLine(
                    activeBatch.lines.find((l) => l.employeeId === line.employeeId)!,
                  );
                  const linePaid = isPayrollLinePaid(stored, activeBatch.status);
                  const displayLine = linePaid ? stored : line;
                  return (
                    <PayrollLineCard
                      key={line.employeeId}
                      employee={emp}
                      line={displayLine}
                      batchStatus={activeBatch.status}
                      draft={draft}
                      isEditable={isEditable && !linePaid}
                      canPay={canPay && !linePaid}
                      vaults={vaults}
                      banks={banks}
                      onDraftChange={(patch) => updateDraft(line.employeeId, patch)}
                      onPay={() => void openEmployeePay(line.employeeId)}
                    />
                  );
                })
              )}
            </div>

            {isEditable ? (
              <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground" role="note">
                <Users className="mr-1 inline h-3.5 w-3.5" />
                صرف فردي أو جماعي — الديون تُسوّى تلقائياً مع الخزينة.
              </p>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-border bg-canvas-sunken/50 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {canDelete && onDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-rose-700 hover:text-rose-800 sm:me-auto sm:w-auto"
                  disabled={busy}
                  onClick={async () => {
                    const hasPaid = paidCount > 0;
                    const msg = hasPaid
                      ? 'حذف الكشف وإلغاء حركات الصرف المرتبطة؟ لا يمكن التراجع.'
                      : 'حذف كشف الرواتب؟ لا يمكن التراجع.';
                    if (!confirm(msg)) return;
                    setBusy(true);
                    try {
                      const res = await onDelete();
                      if (res.ok) {
                        toast.success('تم حذف كشف الرواتب');
                        onOpenChange(false);
                      } else {
                        toast.error(res.error ?? 'تعذّر الحذف');
                      }
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  حذف الكشف
                </Button>
              ) : (
                <span className="hidden sm:block" />
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {isEditable ? (
                <>
                  {onPay && canPay && unpaidCount > 0 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      disabled={busy}
                      onClick={async () => {
                        await save();
                        onPay();
                      }}
                    >
                      <Wallet className="h-4 w-4" />
                      صرف المتبقي ({unpaidCount})
                    </Button>
                  ) : null}
                  <Button onClick={save} disabled={busy} size="sm" className="w-full sm:w-auto">
                    <BadgeDollarSign className="h-4 w-4" />
                    {busy ? 'جارٍ الحفظ…' : 'حفظ'}
                  </Button>
                </>
              ) : null}
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                إغلاق
              </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PayrollEmployeePayDialog
        target={payTarget}
        onClose={() => setPayTarget(null)}
        vaults={vaults}
        banks={banks}
        cashMovements={cashMovements}
        onPay={async (batchId, employeeId, source) => {
          const res = await onPayEmployee(batchId, employeeId, source);
          if (res.ok) {
            toast.success('تم صرف الراتب');
            setPayTarget(null);
          } else {
            toast.error(res.error ?? 'تعذّر الصرف');
            throw new Error(res.error);
          }
        }}
      />
    </>
  );
}
