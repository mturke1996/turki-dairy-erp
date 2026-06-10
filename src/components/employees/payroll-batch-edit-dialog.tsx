'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowRightLeft,
  BadgeDollarSign,
  Gift,
  HandCoins,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Money, moneyText } from '@/components/shared/money';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PAYROLL_DEBT_MODE_LABELS, PAYROLL_STATUS_LABELS, PAYROLL_TYPE_LABELS } from '@/lib/domain/constants';
import {
  buildPayrollLine,
  normalizePayrollLine,
  payrollBatchAdvanceDeducted,
  payrollBatchBonusTotal,
  payrollBatchCarriedForward,
  payrollBatchGrossTotal,
  payrollBatchTotal,
} from '@/lib/domain/payroll';
import type { Employee, PayrollBatch, PayrollDebtMode } from '@/lib/domain/types';
import { formatShortDate } from '@/lib/utils';

type LineDraft = {
  employeeId: string;
  bonusAmount: number;
  debtMode: PayrollDebtMode;
  notes: string;
};

function SummaryPill({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'rose' | 'meadow' | 'navy' }) {
  const toneClass =
    tone === 'rose'
      ? 'border-rose-200 bg-rose-50/50'
      : tone === 'meadow'
        ? 'border-meadow-200 bg-meadow-50/50'
        : tone === 'navy'
          ? 'border-navy-200 bg-navy-50/40'
          : 'border-border bg-canvas-sunken/40';
  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-[14px] font-semibold">{value}</div>
    </div>
  );
}

export function PayrollBatchEditDialog({
  batch,
  employees,
  advanceBalanceOf,
  open,
  onOpenChange,
  onSave,
  onPay,
  canPay,
}: {
  batch: PayrollBatch | null;
  employees: Employee[];
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
  canPay: boolean;
}) {
  const [drafts, setDrafts] = useState<LineDraft[]>([]);
  const [busy, setBusy] = useState(false);

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
  }, [batch, open]);

  const previewLines = useMemo(() => {
    if (!batch) return [];
    return drafts.map((d) => {
      const employee = employees.find((e) => e.id === d.employeeId);
      if (!employee) return normalizePayrollLine(batch.lines.find((l) => l.employeeId === d.employeeId)!);
      return buildPayrollLine({
        employee,
        batchType: batch.payrollType,
        periodFrom: batch.periodFrom,
        periodTo: batch.periodTo,
        advanceBalance: advanceBalanceOf(d.employeeId),
        bonusAmount: d.bonusAmount,
        debtMode: d.debtMode,
        notes: d.notes || undefined,
      });
    });
  }, [batch, drafts, employees, advanceBalanceOf]);

  const totals = useMemo(
    () => ({
      gross: payrollBatchGrossTotal(previewLines),
      bonus: payrollBatchBonusTotal(previewLines),
      deducted: payrollBatchAdvanceDeducted(previewLines),
      carried: payrollBatchCarriedForward(previewLines),
      net: payrollBatchTotal(previewLines),
    }),
    [previewLines],
  );

  if (!batch) return null;
  const activeBatch = batch;
  const isPaid = activeBatch.status === 'paid';
  const isEditable = !isPaid;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0">
        <div className="border-b border-border bg-navy-900 px-6 py-5 text-white">
          <DialogHeader className="space-y-1.5 text-right">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-[17px] text-white">{activeBatch.label}</DialogTitle>
              <Badge variant={isPaid ? 'success' : 'neutral'} className="text-[10px]">
                {PAYROLL_STATUS_LABELS[activeBatch.status]}
              </Badge>
            </div>
            <DialogDescription className="text-[12.5px] text-white/70">
              {PAYROLL_TYPE_LABELS[activeBatch.payrollType]} · {formatShortDate(activeBatch.periodFrom)} — {formatShortDate(activeBatch.periodTo)}
              <span className="mx-1.5">·</span>
              <span dir="ltr" className="font-mono">{activeBatch.ref}</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[min(72vh,640px)] space-y-4 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <SummaryPill label="إجمالي الأجور" value={<Money value={totals.gross} decimals={0} />} tone="navy" />
            <SummaryPill
              label="المكافآت"
              value={<Money value={totals.bonus} decimals={0} />}
              tone="meadow"
            />
            <SummaryPill
              label="خصم الدين"
              value={<Money value={totals.deducted} decimals={0} />}
              tone="rose"
            />
            <SummaryPill
              label="مُرحَّل"
              value={<Money value={totals.carried} decimals={0} />}
            />
            <SummaryPill
              label="صافي الصرف"
              value={<Money value={totals.net} decimals={0} className="font-bold" />}
              tone="navy"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الموظف</TableHead>
                  <TableHead className="text-left">الإجمالي</TableHead>
                  <TableHead className="text-left">الدين</TableHead>
                  <TableHead>المكافأة</TableHead>
                  <TableHead>معالجة الدين</TableHead>
                  <TableHead className="text-left">بعد الدين</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewLines.map((line) => {
                  const emp = employees.find((e) => e.id === line.employeeId);
                  const draft = drafts.find((d) => d.employeeId === line.employeeId)!;
                  const grossWithBonus = line.grossSalary + line.bonusAmount;
                  return (
                    <TableRow key={line.employeeId}>
                      <TableCell>
                        <p className="text-[12.5px] font-medium">{emp?.fullName ?? '—'}</p>
                        <p className="text-[10.5px] text-muted-foreground">
                          {line.attendanceDays} يوم حضور
                          {line.absenceDays > 0 ? ` · غياب ${line.absenceDays}` : ''}
                        </p>
                      </TableCell>
                      <TableCell className="text-left">
                        <Money value={grossWithBonus} decimals={0} className="font-medium" />
                        {line.bonusAmount > 0 ? (
                          <p className="text-[10px] text-meadow-700">
                            <Gift className="mr-0.5 inline h-3 w-3" />
                            +{moneyText(line.bonusAmount, 0)}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-left">
                        <Money value={line.debtBefore} decimals={0} />
                        {line.debtCarriedForward > 0 ? (
                          <p className="text-[10px] text-amber-700">
                            <ArrowRightLeft className="mr-0.5 inline h-3 w-3" />
                            يُرحَّل {moneyText(line.debtCarriedForward, 0)}
                          </p>
                        ) : line.advanceDeducted > 0 ? (
                          <p className="text-[10px] text-rose-700">
                            <HandCoins className="mr-0.5 inline h-3 w-3" />
                            −{moneyText(line.advanceDeducted, 0)}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {isEditable ? (
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            dir="ltr"
                            value={draft.bonusAmount || ''}
                            onChange={(e) =>
                              updateDraft(line.employeeId, {
                                bonusAmount: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="h-9 w-24 text-left"
                            placeholder="0"
                          />
                        ) : (
                          <Money value={line.bonusAmount} decimals={0} />
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditable && line.debtBefore > 0 ? (
                          <Select
                            value={draft.debtMode}
                            onValueChange={(v) =>
                              updateDraft(line.employeeId, { debtMode: v as PayrollDebtMode })
                            }
                          >
                            <SelectTrigger className="h-9 min-w-[148px] text-[11.5px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(PAYROLL_DEBT_MODE_LABELS) as PayrollDebtMode[]).map((m) => (
                                <SelectItem key={m} value={m} className="text-[12px]">
                                  {PAYROLL_DEBT_MODE_LABELS[m]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : line.debtBefore > 0 ? (
                          <Badge variant="neutral" className="text-[10px]">
                            {PAYROLL_DEBT_MODE_LABELS[line.debtMode]}
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-left">
                        <Money value={line.netSalary} decimals={0} className="font-bold text-navy-800" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {isEditable ? (
            <p className="text-[11.5px] text-muted-foreground" role="note">
              <Users className="mr-1 inline h-3.5 w-3.5" />
              «ترحيل للفترة القادمة» يصرف الراتب كاملاً ويبقي الدين للنصف/الشهر التالي. «خصم من الراتب» يُسوّى الديون المسجّلة تلقائياً عند الصرف.
            </p>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border bg-canvas-sunken/40 px-6 py-4">
          {isEditable ? (
            <>
              <Button onClick={save} disabled={busy}>
                <BadgeDollarSign className="h-4 w-4" />
                {busy ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}
              </Button>
              {onPay && canPay ? (
                <Button
                  variant="outline"
                  onClick={async () => {
                    await save();
                    onPay();
                  }}
                  disabled={busy}
                >
                  حفظ وصرف
                </Button>
              ) : null}
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              إغلاق
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
