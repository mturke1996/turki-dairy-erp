'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Banknote, Briefcase, Calendar, HandCoins, Pencil, Phone, User } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Money } from '@/components/shared/money';
import { EmptyState } from '@/components/shared/empty-state';
import { EmployeeFormDialog } from './employee-form-dialog';
import { EmployeeAdvanceDialog } from './employee-advance-dialog';
import { DebtSettleDialog } from '@/components/debts/debt-settle-dialog';
import { useErpData, useDerived } from '@/lib/store/use-derived';
import { useErpStore } from '@/lib/store/use-erp-store';
import { usePermission } from '@/lib/store/use-permission';
import {
  CONTRACT_TYPE_LABELS,
  DEPARTMENT_LABELS,
  EMPLOYEE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYROLL_DEBT_MODE_LABELS,
  PAYROLL_STATUS_LABELS,
  SALARY_BASE_LABELS,
  SALARY_TYPE_LABELS,
} from '@/lib/domain/constants';
import { normalizePayrollLine, payoutSourceLabel } from '@/lib/domain/payroll';
import { computeEmployeeDebtBreakdown, type EmployeeStats } from '@/lib/domain/calculations';
import { debtRemainingAmount, isDebtFullySettled, resolveDebtDirection } from '@/lib/domain/debt';
import { formatShortDate } from '@/lib/utils';
import { RowDeleteButton } from '@/components/shared/row-delete-button';
import { PartyDeleteButton } from '@/components/shared/party-delete-button';
import { toast } from 'sonner';

const STATUS_VARIANT = { active: 'success', on_leave: 'warning', terminated: 'neutral' } as const;

function SummaryCell({ label, value, highlight }: { label: string; value: ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${highlight ? 'border-meadow-200 bg-meadow-50/60' : 'border-border bg-canvas-sunken/40'}`}>
      <p className="text-[10.5px] text-muted-foreground">{label}</p>
      <div className={`mt-1 text-[14px] font-semibold ${highlight ? 'text-meadow-800' : 'text-foreground'}`}>{value}</div>
    </div>
  );
}

export function EmployeeDetailDialog({
  employeeId,
  open,
  onOpenChange,
}: {
  employeeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const data = useErpData();
  const d = useDerived();
  const vaults = useErpStore((s) => s.vaults);
  const banks = useErpStore((s) => s.banks);
  const cashMovements = useErpStore((s) => s.cashMovements);
  const updateEmployee = useErpStore((s) => s.updateEmployee);
  const deleteEmployee = useErpStore((s) => s.deleteEmployee);
  const deletePayment = useErpStore((s) => s.deletePayment);
  const recordEmployeeAdvance = useErpStore((s) => s.recordEmployeeAdvance);
  const canPay = usePermission('payroll.pay');

  const [editOpen, setEditOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);

  const employee = d.employees.find((e) => e.id === employeeId) as EmployeeStats | undefined;
  const raw = data.employees.find((e) => e.id === employeeId) ?? null;

  const advances = useMemo(
    () =>
      data.payments
        .filter((p) => p.kind === 'employee_advance' && p.partyId === employeeId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.payments, employeeId],
  );

  const payrollHistory = useMemo(() => {
    if (!employeeId) return [];
    return data.payrollBatches
      .flatMap((b) =>
        b.lines
          .filter((l) => l.employeeId === employeeId)
          .map((l) => ({ batch: b, line: l })),
      )
      .sort((a, b) => (b.batch.paidAt ?? b.batch.createdAt).localeCompare(a.batch.paidAt ?? a.batch.createdAt));
  }, [data.payrollBatches, employeeId]);

  const debtBreakdown = useMemo(
    () =>
      employeeId
        ? computeEmployeeDebtBreakdown(
            employeeId,
            data.payments,
            data.payrollBatches,
            data.debtEntries,
          )
        : null,
    [employeeId, data.payments, data.payrollBatches, data.debtEntries],
  );

  const registeredDebts = useMemo(
    () =>
      data.debtEntries
        .filter(
          (entry) =>
            entry.partyKind === 'employee' &&
            entry.partyId === employeeId &&
            !isDebtFullySettled(entry) &&
            resolveDebtDirection(entry) === 'receivable',
        )
        .sort((a, b) => a.date.localeCompare(b.date)),
    [data.debtEntries, employeeId],
  );

  const primaryRegisteredDebt = registeredDebts[0] ?? null;

  if (!employee || !raw) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>الموظف</DialogTitle>
            <DialogDescription className="sr-only">تفاصيل الموظف</DialogDescription>
          </DialogHeader>
          <EmptyState title="الموظف غير موجود" description="ربما حُذف أو لم يُحمَّل بعد." />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex flex-wrap items-start justify-between gap-3 pl-8">
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-2">
                  {employee.fullName}
                  <Badge variant={STATUS_VARIANT[employee.status]}>{EMPLOYEE_STATUS_LABELS[employee.status]}</Badge>
                </DialogTitle>
                <DialogDescription className="sr-only">
                  ملف الموظف {employee.code} — الراتب والسلف وكشوف الرواتب
                </DialogDescription>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                  <span className="font-mono" dir="ltr">{employee.code}</span>
                  <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {employee.jobTitle}</span>
                  <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {DEPARTMENT_LABELS[employee.department]}</span>
                  {employee.phone ? (
                    <span className="flex items-center gap-1" dir="ltr"><Phone className="h-3.5 w-3.5" /> {employee.phone}</span>
                  ) : null}
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCell label="نوع الراتب" value={SALARY_TYPE_LABELS[raw.salaryType ?? 'monthly']} />
            <SummaryCell label={SALARY_BASE_LABELS[raw.salaryType ?? 'monthly']} value={<Money value={raw.baseSalary} decimals={0} />} />
            <SummaryCell
              label="المستحق على الموظف"
              value={<Money value={employee.advanceBalance} decimals={0} />}
              highlight={employee.advanceBalance > 0}
            />
            <SummaryCell label="صرف YTD" value={<Money value={employee.ytdPaid} decimals={0} />} />
          </div>

          {debtBreakdown && debtBreakdown.totalOwed > 0 ? (
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-canvas-sunken/30 p-3 sm:grid-cols-4">
              <div>
                <p className="text-[10px] text-muted-foreground">سلف مسجّلة</p>
                <Money value={debtBreakdown.advancesTotal} decimals={0} className="mt-0.5 text-[13px] font-semibold" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">مُسترد من الرواتب</p>
                <Money value={debtBreakdown.advancesRecovered} decimals={0} className="mt-0.5 text-[13px] font-semibold text-meadow-700" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">ديون مسجّلة</p>
                <Money value={debtBreakdown.registeredDebt} decimals={0} className="mt-0.5 text-[13px] font-semibold" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">المتبقي</p>
                <Money value={debtBreakdown.totalOwed} decimals={0} className="mt-0.5 text-[13px] font-bold text-foreground" />
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              تعديل
            </Button>
            <PartyDeleteButton
              label={`الموظف ${employee.fullName}`}
              onConfirm={async () => {
                const res = await deleteEmployee(raw.id);
                if (res.ok) onOpenChange(false);
                return res;
              }}
            />
            {canPay && employee.status === 'active' ? (
              <Button size="sm" onClick={() => setAdvanceOpen(true)}>
                <Banknote className="h-4 w-4" />
                سلفة
              </Button>
            ) : null}
            {canPay && primaryRegisteredDebt ? (
              <Button size="sm" variant="meadow" onClick={() => setSettleOpen(true)}>
                <HandCoins className="h-4 w-4" />
                تسوية دين
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 rounded-lg border border-border bg-canvas-sunken/40 p-3 text-[12px] sm:grid-cols-2">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">بيانات التعيين</p>
              <p className="mt-2 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-muted-foreground" /> {formatShortDate(raw.hireDate)}</p>
              <p className="mt-1 text-muted-foreground">{CONTRACT_TYPE_LABELS[raw.contractType]}</p>
              {raw.nationalId ? <p className="mt-1 font-mono" dir="ltr">{raw.nationalId}</p> : null}
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">تفصيل الراتب</p>
              <p className="mt-2">{SALARY_BASE_LABELS[raw.salaryType ?? 'monthly']}: <Money value={raw.baseSalary} decimals={0} className="inline" /></p>
              <p className="mt-1 text-muted-foreground">
                بدلات: سكن {raw.allowances.housing} · نقل {raw.allowances.transport} · طعام {raw.allowances.food}
              </p>
              {raw.defaultPayoutType && raw.defaultPayoutId ? (
                <p className="mt-1 text-muted-foreground">
                  صرف من: {payoutSourceLabel(raw.defaultPayoutType, raw.defaultPayoutId, vaults, banks)}
                </p>
              ) : null}
            </div>
          </div>

          <Tabs defaultValue="payroll">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="payroll">كشوف الرواتب</TabsTrigger>
              <TabsTrigger value="advances">السلف ({advances.length})</TabsTrigger>
              <TabsTrigger value="registered-debts">ديون مسجّلة ({registeredDebts.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="payroll" className="mt-3">
              {payrollHistory.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الكشف</TableHead>
                      <TableHead>الفترة</TableHead>
                      <TableHead className="text-left">الإجمالي</TableHead>
                      <TableHead className="text-left">الدين</TableHead>
                      <TableHead className="text-left">بعد الدين</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollHistory.map(({ batch, line }) => {
                      const n = normalizePayrollLine(line);
                      return (
                      <TableRow key={`${batch.id}-${line.employeeId}`}>
                        <TableCell>
                          <p className="text-[12.5px] font-medium">{batch.label}</p>
                          <p className="text-[11px] text-muted-foreground" dir="ltr">{batch.ref}</p>
                        </TableCell>
                        <TableCell className="text-[12px] text-muted-foreground" dir="ltr">
                          {formatShortDate(batch.periodFrom)} — {formatShortDate(batch.periodTo)}
                        </TableCell>
                        <TableCell className="text-left">
                          <Money value={n.grossSalary + n.bonusAmount} decimals={0} />
                          {n.bonusAmount > 0 ? (
                            <p className="text-[10px] text-meadow-700">مكافأة +{n.bonusAmount}</p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-left">
                          {n.debtBefore > 0 ? (
                            <>
                              <Money value={n.debtBefore} decimals={0} className="text-rose-700" />
                              {n.advanceDeducted > 0 ? (
                                <p className="text-[10px] text-muted-foreground">خصم −{n.advanceDeducted}</p>
                              ) : n.debtCarriedForward > 0 ? (
                                <p className="text-[10px] text-amber-700">{PAYROLL_DEBT_MODE_LABELS.carry_forward}</p>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-left"><Money value={line.netSalary} decimals={0} className="font-semibold" /></TableCell>
                        <TableCell><Badge variant={batch.status === 'paid' ? 'success' : batch.status === 'approved' ? 'info' : 'neutral'}>{PAYROLL_STATUS_LABELS[batch.status]}</Badge></TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState icon={Briefcase} title="لا كشوف بعد" description="ستظهر هنا عند إنشاء وصرف الرواتب." />
              )}
            </TabsContent>
            <TabsContent value="advances" className="mt-3">
              {advances.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead className="text-left">المبلغ</TableHead>
                      <TableHead>الطريقة</TableHead>
                      <TableHead>ملاحظات</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {advances.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-[12px]" dir="ltr">{formatShortDate(p.date)}</TableCell>
                        <TableCell className="text-left"><Money value={p.amount} decimals={0} className="font-semibold" /></TableCell>
                        <TableCell className="text-[12px]">{PAYMENT_METHOD_LABELS[p.method]}</TableCell>
                        <TableCell className="text-[12px] text-muted-foreground">{p.notes ?? '—'}</TableCell>
                        <TableCell>
                          <RowDeleteButton
                            label={p.ref}
                            onConfirm={async () => {
                              const res = await deletePayment(p.id);
                              if (res.ok) toast.success('تم حذف السلفة');
                              else toast.error(res.error ?? 'تعذّر الحذف');
                              return res;
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState icon={Banknote} title="لا سلف مسجّلة" description="سجّل سلفة من الزر أعلاه." />
              )}
            </TabsContent>
            <TabsContent value="registered-debts" className="mt-3">
              {registeredDebts.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead className="text-left">المتبقي</TableHead>
                      <TableHead>الوصف</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registeredDebts.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-[12px]" dir="ltr">{formatShortDate(entry.date)}</TableCell>
                        <TableCell className="text-left">
                          <Money value={debtRemainingAmount(entry)} decimals={0} className="font-semibold" />
                        </TableCell>
                        <TableCell className="text-[12px] text-muted-foreground">{entry.description ?? entry.ref}</TableCell>
                        <TableCell />
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState icon={HandCoins} title="لا ديون مسجّلة" description="يُخصم الدين المسجّل تلقائياً عند صرف الراتب، أو يُسوّى نقداً." />
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <EmployeeFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        employee={raw}
        vaults={vaults}
        banks={banks}
        onSubmit={async (input) => {
          const res = await updateEmployee(raw.id, input);
          if (res.ok) {
            toast.success('تم تحديث بيانات الموظف');
            setEditOpen(false);
          } else {
            toast.error(res.error ?? 'تعذّر التحديث');
          }
        }}
      />

      <EmployeeAdvanceDialog
        employee={employee}
        open={advanceOpen}
        onOpenChange={setAdvanceOpen}
        vaults={vaults}
        banks={banks}
        cashMovements={cashMovements}
        onSubmit={(input) => {
          void (async () => {
            const res = await recordEmployeeAdvance(input);
            if (res.ok) {
              toast.success('تم تسجيل السلفة');
              setAdvanceOpen(false);
            } else toast.error(res.error ?? 'تعذّر التسجيل');
          })();
        }}
      />
      <DebtSettleDialog open={settleOpen} onOpenChange={setSettleOpen} entry={primaryRegisteredDebt} />
    </>
  );
}
