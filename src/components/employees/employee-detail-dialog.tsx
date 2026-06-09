'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Banknote, Briefcase, Calendar, Pencil, Phone, User } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Money } from '@/components/shared/money';
import { EmptyState } from '@/components/shared/empty-state';
import { EmployeeFormDialog } from './employee-form-dialog';
import { EmployeeAdvanceDialog } from './employee-advance-dialog';
import { useErpData, useDerived } from '@/lib/store/use-derived';
import { useErpStore } from '@/lib/store/use-erp-store';
import { usePermission } from '@/lib/store/use-permission';
import {
  CONTRACT_TYPE_LABELS,
  DEPARTMENT_LABELS,
  EMPLOYEE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYROLL_STATUS_LABELS,
} from '@/lib/domain/constants';
import type { EmployeeStats } from '@/lib/domain/calculations';
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
  const updateEmployee = useErpStore((s) => s.updateEmployee);
  const deleteEmployee = useErpStore((s) => s.deleteEmployee);
  const deletePayment = useErpStore((s) => s.deletePayment);
  const recordEmployeeAdvance = useErpStore((s) => s.recordEmployeeAdvance);
  const canPay = usePermission('payroll.pay');

  const [editOpen, setEditOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);

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

  const tenureMonths = Math.max(
    0,
    Math.floor((Date.now() - new Date(raw.hireDate).getTime()) / (30 * 86_400_000)),
  );

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
            <SummaryCell label="الراتب الشهري" value={<Money value={employee.grossSalary} decimals={0} />} />
            <SummaryCell label="الدين" value={<Money value={employee.advanceBalance} decimals={0} />} highlight={employee.advanceBalance > 0} />
            <SummaryCell label="صرف YTD" value={<Money value={employee.ytdPaid} decimals={0} />} />
            <SummaryCell label="مدة الخدمة" value={`${tenureMonths} شهر`} />
          </div>

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
                دين
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
              <p className="mt-2">أساسي: <Money value={raw.baseSalary} decimals={0} className="inline" /></p>
              <p className="mt-1 text-muted-foreground">
                بدلات: سكن {raw.allowances.housing} · نقل {raw.allowances.transport} · طعام {raw.allowances.food}
              </p>
            </div>
          </div>

          <Tabs defaultValue="payroll">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="payroll">كشوف الرواتب</TabsTrigger>
              <TabsTrigger value="advances">الديون ({advances.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="payroll" className="mt-3">
              {payrollHistory.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الكشف</TableHead>
                      <TableHead>الفترة</TableHead>
                      <TableHead className="text-left">خصم دين</TableHead>
                      <TableHead className="text-left">الصافي</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollHistory.map(({ batch, line }) => (
                      <TableRow key={`${batch.id}-${line.employeeId}`}>
                        <TableCell>
                          <p className="text-[12.5px] font-medium">{batch.label}</p>
                          <p className="text-[11px] text-muted-foreground" dir="ltr">{batch.ref}</p>
                        </TableCell>
                        <TableCell className="text-[12px] text-muted-foreground" dir="ltr">
                          {formatShortDate(batch.periodFrom)} — {formatShortDate(batch.periodTo)}
                        </TableCell>
                        <TableCell className="text-left"><Money value={line.advanceDeducted} decimals={0} /></TableCell>
                        <TableCell className="text-left"><Money value={line.netSalary} decimals={0} className="font-semibold" /></TableCell>
                        <TableCell><Badge variant={batch.status === 'paid' ? 'success' : batch.status === 'approved' ? 'info' : 'neutral'}>{PAYROLL_STATUS_LABELS[batch.status]}</Badge></TableCell>
                      </TableRow>
                    ))}
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
                <EmptyState icon={Banknote} title="لا ديون مسجّلة" description="سجّل ديناً من الزر أعلاه." />
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <EmployeeFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        employee={raw}
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
        onSubmit={(input) => {
          void (async () => {
            const res = await recordEmployeeAdvance(input);
            if (res.ok) {
              toast.success('تم تسجيل الدين');
              setAdvanceOpen(false);
            } else toast.error(res.error ?? 'تعذّر التسجيل');
          })();
        }}
      />
    </>
  );
}
