'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Users, Plus, Wallet, BadgeDollarSign, CalendarClock, UserCheck, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { AccessGate } from '@/components/shared/access-gate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Money } from '@/components/shared/money';
import { StatTile } from '@/components/shared/stat-tile';
import { EmptyState } from '@/components/shared/empty-state';
import { EmployeeFormDialog } from '@/components/employees/employee-form-dialog';
import { EmployeeDetailDialog } from '@/components/employees/employee-detail-dialog';
import { EmployeeListCard, EmployeeStatusChips } from '@/components/employees/employee-list-card';
import { PayrollBatchCard } from '@/components/employees/payroll-batch-card';
import { PayrollBatchDialog } from '@/components/employees/payroll-batch-dialog';
import { PayrollBatchEditDialog } from '@/components/employees/payroll-batch-edit-dialog';
import { PayrollPayDialog } from '@/components/employees/payroll-pay-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TurkiPdfToolbar } from '@/features/pdf/pdf-toolbar';
import { PayrollPDF, type PayrollLineRow } from '@/features/pdf/PayrollPDF';
import { useErpStore } from '@/lib/store/use-erp-store';
import { usePermission } from '@/lib/store/use-permission';
import {
  EMPLOYEE_STATUS_LABELS,
  PAYROLL_STATUS_LABELS,
  PAYROLL_TYPE_LABELS,
  SALARY_TYPE_LABELS,
} from '@/lib/domain/constants';
import { computeEmployeeAdvanceBalance } from '@/lib/domain/calculations';
import {
  computeMonthlyLaborBreakdown,
  employeePeriodPackage,
  normalizePayrollLine,
  payoutSourceLabel,
  payrollBatchAdvanceDeducted,
  payrollBatchBonusTotal,
  payrollBatchCarriedForward,
  payrollBatchGrossTotal,
  payrollBatchIsPartial,
  payrollBatchPaidCount,
  payrollBatchTotal,
} from '@/lib/domain/payroll';
import type {
  EmployeeStatus,
  PayrollBatch,
} from '@/lib/domain/types';
import { useDerived } from '@/lib/store/use-derived';
import { formatShortDate, cn } from '@/lib/utils';

const EMP_STATUS_VARIANT: Record<EmployeeStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  on_leave: 'warning',
  terminated: 'neutral',
};
const PR_STATUS_VARIANT: Record<PayrollBatch['status'], 'neutral' | 'info' | 'success'> = {
  draft: 'neutral',
  approved: 'info',
  paid: 'success',
};

export default function HrPage() {
  return (
    <AccessGate permission="hr.manage">
      <HrContent />
    </AccessGate>
  );
}

function HrContent() {
  const d = useDerived();
  const employees = d.employees;
  const rawEmployees = useErpStore((s) => s.employees);
  const batches = useErpStore((s) => s.payrollBatches);
  const vaults = useErpStore((s) => s.vaults);
  const banks = useErpStore((s) => s.banks);
  const payments = useErpStore((s) => s.payments);
  const debtEntries = useErpStore((s) => s.debtEntries);
  const cashMovements = useErpStore((s) => s.cashMovements);
  const addEmployee = useErpStore((s) => s.addEmployee);
  const createPayrollBatch = useErpStore((s) => s.createPayrollBatch);
  const updatePayrollBatchLines = useErpStore((s) => s.updatePayrollBatchLines);
  const payPayrollBatch = useErpStore((s) => s.payPayrollBatch);
  const payPayrollEmployeeLine = useErpStore((s) => s.payPayrollEmployeeLine);
  const deletePayrollBatch = useErpStore((s) => s.deletePayrollBatch);
  const canPay = usePermission('payroll.pay');
  const canDeleteAdmin = usePermission('transactions.delete');

  function canDeleteBatch(batch: PayrollBatch) {
    return canDeleteAdmin || (canPay && batch.status !== 'paid');
  }

  async function handleDeleteBatch(batch: PayrollBatch, opts?: { skipConfirm?: boolean }) {
    if (!opts?.skipConfirm) {
      const hasPaid =
        batch.status === 'paid' || payrollBatchPaidCount(batch.lines, batch.status) > 0;
      const msg = hasPaid
        ? `حذف «${batch.label}» وإلغاء حركات الصرف المرتبطة؟ لا يمكن التراجع.`
        : `حذف كشف «${batch.label}»؟ لا يمكن التراجع.`;
      if (!confirm(msg)) return { ok: false as const };
    }
    const res = await deletePayrollBatch(batch.id);
    if (res.ok) {
      toast.success('تم حذف كشف الرواتب');
      if (editTarget?.id === batch.id) setEditTarget(null);
      if (payTarget?.id === batch.id) setPayTarget(null);
    } else {
      toast.error(res.error ?? 'تعذّر الحذف');
    }
    return res;
  }

  function buildPayrollProps(b: PayrollBatch) {
    const rows: PayrollLineRow[] = b.lines.map((l) => {
      const emp = employees.find((e) => e.id === l.employeeId);
      const n = normalizePayrollLine(l);
      return {
        name: emp?.fullName ?? 'موظف',
        jobTitle: emp?.jobTitle ?? '',
        base: l.baseSalary,
        allowances: l.allowancesTotal,
        gross: n.grossSalary + n.bonusAmount,
        bonus: n.bonusAmount,
        debtBefore: n.debtBefore,
        deductions: l.deductionsTotal,
        net: l.netSalary,
      };
    });
    const paidFrom = b.paidFromId
      ? b.paidFromType === 'vault'
        ? vaults.find((v) => v.id === b.paidFromId)?.name
        : banks.find((bk) => bk.id === b.paidFromId)?.bankName
      : undefined;
    return {
      label: b.label,
      periodFrom: b.periodFrom,
      periodTo: b.periodTo,
      total: b.totalAmount,
      statusLabel: PAYROLL_STATUS_LABELS[b.status],
      paidFrom,
      rows,
    };
  }

  const active = employees.filter((e) => e.status === 'active');
  const laborBreakdown = useMemo(() => computeMonthlyLaborBreakdown(rawEmployees), [rawEmployees]);
  const monthlyLabor = laborBreakdown.total;
  const lastPaid = useMemo(
    () => batches.filter((b) => b.status === 'paid').sort((a, b) => +new Date(b.paidAt ?? 0) - +new Date(a.paidAt ?? 0))[0],
    [batches],
  );
  const totalPaid = useMemo(() => batches.filter((b) => b.status === 'paid').reduce((s, b) => s + b.totalAmount, 0), [batches]);

  const [empOpen, setEmpOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<PayrollBatch | null>(null);
  const [editTarget, setEditTarget] = useState<PayrollBatch | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | EmployeeStatus>('all');
  const [mobileSection, setMobileSection] = useState<'staff' | 'payroll'>('staff');

  const filteredEmployees = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees
      .filter((e) => (status === 'all' ? true : e.status === status))
      .filter((e) =>
        !q
          ? true
          : e.fullName.toLowerCase().includes(q) ||
            e.code.toLowerCase().includes(q) ||
            e.jobTitle.toLowerCase().includes(q) ||
            e.phone.includes(q),
      );
  }, [employees, query, status]);

  const statusCounts = useMemo(
    () => ({
      all: employees.length,
      active: employees.filter((e) => e.status === 'active').length,
      on_leave: employees.filter((e) => e.status === 'on_leave').length,
      terminated: employees.filter((e) => e.status === 'terminated').length,
    }),
    [employees],
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="المالية"
        title="الموظفون والرواتب"
        description="إدارة الكوادر والرواتب — صرف فردي أو جماعي مربوط بالخزينة والديون."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setEmpOpen(true)}>
              <Plus className="h-4 w-4" />
              موظف جديد
            </Button>
            <Button className="w-full sm:w-auto" onClick={() => setBatchOpen(true)} disabled={active.length === 0}>
              <BadgeDollarSign className="h-4 w-4" />
              كشف رواتب
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="النشطون" value={active.length} icon={UserCheck} tone="meadow" hint={`${employees.length} إجمالي`} />
        <StatTile
          label="كلفة شهرية"
          value={<Money value={monthlyLabor} decimals={0} />}
          icon={Users}
          tone="navy"
          hint={
            laborBreakdown.allHalfMonth
              ? `نصف شهر ${laborBreakdown.halfMonthPerPay.toLocaleString('ar-LY')} × 2`
              : laborBreakdown.halfMonthPerPay > 0
                ? `نصف شهر ${laborBreakdown.halfMonthPerPay.toLocaleString('ar-LY')} × 2 + آخرون`
                : `${active.length} نشط`
          }
        />
        <StatTile label="آخر صرف" value={lastPaid ? <Money value={lastPaid.totalAmount} decimals={0} /> : '—'} icon={CalendarClock} tone="sun" hint={lastPaid?.paidAt ? formatShortDate(lastPaid.paidAt) : 'لم يُصرف'} />
        <StatTile label="إجمالي المصروف" value={<Money value={totalPaid} decimals={0} />} icon={Wallet} tone="neutral" hint="كل الكشوف" />
      </div>

      {/* تبويب جوال — الكوادر / كشوف الرواتب */}
      <div className="flex gap-1.5 rounded-xl border border-border bg-canvas-sunken/40 p-1 md:hidden" role="tablist" aria-label="أقسام الموارد البشرية">
        {(
          [
            { key: 'staff' as const, label: 'الكوادر', count: employees.length, icon: Users },
            { key: 'payroll' as const, label: 'الرواتب', count: batches.length, icon: BadgeDollarSign },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={mobileSection === tab.key}
            onClick={() => setMobileSection(tab.key)}
            className={cn(
              'flex h-11 min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium transition-colors',
              mobileSection === tab.key
                ? 'bg-card text-foreground shadow-whisper ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <tab.icon className="size-4 shrink-0" strokeWidth={2} />
            <span className="truncate">{tab.label}</span>
            <span
              className={cn(
                'shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums leading-none',
                mobileSection === tab.key ? 'bg-navy-50 text-navy-700' : 'bg-border/50 text-muted-foreground',
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* الموظفون */}
      <Card className={cn('overflow-hidden border-0 bg-transparent shadow-none md:border md:bg-card md:shadow-whisper', mobileSection !== 'staff' && 'hidden md:block')}>
        <CardHeader className="hidden pb-3 md:block">
          <CardTitle>الكوادر</CardTitle>
          <CardDescription>قائمة الموظفين وبيانات الراتب والديون</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-0 md:p-6 md:pt-0">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="بحث بالاسم، الكود، المسمّى…"
                className="h-11 pr-9 text-[14px] sm:h-10"
              />
            </div>
            <div className="hidden md:block md:max-w-xs">
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  {(Object.keys(EMPLOYEE_STATUS_LABELS) as EmployeeStatus[]).map((k) => (
                    <SelectItem key={k} value={k}>{EMPLOYEE_STATUS_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <EmployeeStatusChips value={status} onChange={setStatus} counts={statusCounts} />
          </div>

          {filteredEmployees.length > 0 ? (
            <p className="text-[11.5px] text-muted-foreground">
              {filteredEmployees.length} نتيجة{query.trim() ? ` — «${query.trim()}»` : ''}
            </p>
          ) : null}

          {employees.length === 0 ? (
            <EmptyState icon={Users} title="لا يوجد موظفون" description="أضف أول موظف لبدء إدارة الرواتب." />
          ) : filteredEmployees.length ? (
            <>
              <div className="space-y-3 md:hidden">
                {filteredEmployees.map((e) => (
                    <EmployeeListCard
                      key={e.id}
                      employee={{
                        id: e.id,
                        fullName: e.fullName,
                        code: e.code,
                        jobTitle: e.jobTitle,
                        department: e.department,
                        status: e.status,
                        salaryType: e.salaryType ?? 'monthly',
                        grossSalary: employeePeriodPackage(e),
                        advanceBalance: e.advanceBalance,
                        phone: e.phone,
                      }}
                      onClick={() => setDetailId(e.id)}
                    />
                ))}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الموظف</TableHead>
                      <TableHead>المسمّى</TableHead>
                      <TableHead>نوع الراتب</TableHead>
                      <TableHead>مصدر الصرف</TableHead>
                      <TableHead className="text-left">الأجر</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((e) => (
                        <TableRow key={e.id} className="cursor-pointer" onClick={() => setDetailId(e.id)}>
                          <TableCell>
                            <p className="text-[12.5px] font-medium">{e.fullName}</p>
                            <p className="text-[11px] text-muted-foreground" dir="ltr">{e.code}</p>
                          </TableCell>
                          <TableCell className="text-[12.5px]">{e.jobTitle}</TableCell>
                          <TableCell>
                            <Badge variant="neutral" className="text-[10px]">
                              {SALARY_TYPE_LABELS[e.salaryType ?? 'monthly']}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[120px] truncate text-[11.5px] text-muted-foreground">
                            {e.defaultPayoutType && e.defaultPayoutId
                              ? payoutSourceLabel(e.defaultPayoutType, e.defaultPayoutId, vaults, banks)
                              : '—'}
                          </TableCell>
                          <TableCell className="text-left">
                            <Money value={employeePeriodPackage(e)} decimals={0} className="font-semibold tabular-nums" />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-center gap-1">
                              <Badge variant={EMP_STATUS_VARIANT[e.status]}>{EMPLOYEE_STATUS_LABELS[e.status]}</Badge>
                              {e.advanceBalance > 0 ? (
                                <span className="text-[10.5px] text-rose-700">دين <Money value={e.advanceBalance} decimals={0} className="inline text-[10.5px]" /></span>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <EmptyState icon={Users} title="لا موظفين مطابقين" description="جرّب تعديل البحث أو الفلتر." />
          )}
        </CardContent>
      </Card>

      {/* كشوف الرواتب */}
      <Card className={cn('overflow-hidden border-0 bg-transparent shadow-none md:border md:bg-card md:shadow-whisper', mobileSection !== 'payroll' && 'hidden md:block')}>
        <CardHeader className="hidden pb-3 md:block">
          <CardTitle>كشوف الرواتب</CardTitle>
          <CardDescription>الكشوف المنشأة وحالتها</CardDescription>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-6">
          {batches.length === 0 ? (
            <EmptyState icon={BadgeDollarSign} title="لا توجد كشوف" description="أنشئ كشف رواتب من الموظفين النشطين." />
          ) : (
            <>
              <div className="space-y-4 md:hidden">
                {batches.map((b) => (
                  <PayrollBatchCard
                    key={b.id}
                    batch={b}
                    vaults={vaults}
                    banks={banks}
                    canPay={canPay}
                    onEdit={() => setEditTarget(b)}
                    onPay={() => setPayTarget(b)}
                    pdfAction={
                      <TurkiPdfToolbar
                        fileName={`كشف-رواتب-${b.label}`}
                        label="PDF"
                        variant="outline"
                        showDownload={false}
                        render={async () => <PayrollPDF {...buildPayrollProps(b)} />}
                      />
                    }
                  />
                ))}
              </div>
              <div className="hidden md:block">
                <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الكشف</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الفترة</TableHead>
                  <TableHead className="text-left">الأجور</TableHead>
                  <TableHead className="text-left">خصم دين</TableHead>
                  <TableHead className="text-left">صافي الصرف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-left">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((b) => {
                  const gross = payrollBatchGrossTotal(b.lines);
                  const deducted = payrollBatchAdvanceDeducted(b.lines);
                  const bonus = payrollBatchBonusTotal(b.lines);
                  const carried = payrollBatchCarriedForward(b.lines);
                  return (
                  <TableRow key={b.id} className="cursor-pointer" onClick={() => setEditTarget(b)}>
                    <TableCell>
                      <p className="text-[12.5px] font-medium">{b.label}</p>
                      <p className="text-[11px] text-muted-foreground" dir="ltr">{b.ref}</p>
                      <p className="text-[10.5px] text-muted-foreground">{b.lines.length} موظف</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral" className="text-[10px]">{PAYROLL_TYPE_LABELS[b.payrollType]}</Badge>
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground" dir="ltr">
                      {formatShortDate(b.periodFrom)} — {formatShortDate(b.periodTo)}
                    </TableCell>
                    <TableCell className="text-left">
                      <Money value={gross} decimals={0} />
                      {bonus > 0 ? (
                        <p className="text-[10px] text-meadow-700">+{bonus} مكافأة</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-left">
                      {deducted > 0 ? <Money value={deducted} decimals={0} className="text-rose-700" /> : '—'}
                      {carried > 0 ? (
                        <p className="text-[10px] text-amber-700">{carried} مُرحَّل</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-left">
                      <Money value={payrollBatchTotal(b.lines, b.status)} decimals={0} className="font-semibold" />
                      {payrollBatchPaidCount(b.lines, b.status) > 0 && b.status !== 'paid' ? (
                        <p className="text-[10px] text-muted-foreground">
                          {payrollBatchPaidCount(b.lines, b.status)}/{b.lines.length} صُرف
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={payrollBatchIsPartial(b) || b.status === 'approved' ? 'info' : PR_STATUS_VARIANT[b.status]}>
                        {b.status === 'paid' ? PAYROLL_STATUS_LABELS.paid : payrollBatchIsPartial(b) ? PAYROLL_STATUS_LABELS.approved : PAYROLL_STATUS_LABELS[b.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-left" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <TurkiPdfToolbar
                          fileName={`كشف-رواتب-${b.label}`}
                          label="تقرير"
                          variant="outline"
                          showDownload={false}
                          render={async () => <PayrollPDF {...buildPayrollProps(b)} />}
                        />
                        {b.status !== 'paid' ? (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setEditTarget(b)}>
                              مراجعة
                            </Button>
                            <Button size="sm" variant="outline" disabled={!canPay} onClick={() => setPayTarget(b)}>
                              <Wallet className="h-3.5 w-3.5" />
                              صرف
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
                </TableBody>
              </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <EmployeeFormDialog
        open={empOpen}
        onOpenChange={setEmpOpen}
        vaults={vaults}
        banks={banks}
        onSubmit={async (input) => {
          const res = await addEmployee(input);
          if (res.ok) {
            toast.success('تمت إضافة الموظف');
            setEmpOpen(false);
          } else toast.error(res.error ?? 'تعذّرت الإضافة');
        }}
      />

      <EmployeeDetailDialog
        employeeId={detailId}
        open={!!detailId}
        onOpenChange={(o) => !o && setDetailId(null)}
      />

      <PayrollBatchDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        employees={rawEmployees}
        vaults={vaults}
        banks={banks}
        advanceBalanceOf={(id) =>
          computeEmployeeAdvanceBalance(id, payments, batches, debtEntries)
        }
        onSubmit={async (input) => {
          const res = await createPayrollBatch(input);
          if (res.ok) {
            toast.success('تم إنشاء كشف الرواتب — راجع التفاصيل قبل الصرف');
            setBatchOpen(false);
            const fresh = useErpStore.getState().payrollBatches.find((b) => b.id === res.id);
            if (fresh) setEditTarget(fresh);
          } else toast.error(res.error ?? 'تعذّر الإنشاء');
        }}
      />

      <PayrollBatchEditDialog
        batch={editTarget}
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        employees={rawEmployees}
        vaults={vaults}
        banks={banks}
        cashMovements={cashMovements}
        advanceBalanceOf={(id) =>
          computeEmployeeAdvanceBalance(id, payments, batches, debtEntries)
        }
        canPay={canPay}
        onPayEmployee={async (batchId, employeeId, source) => {
          const res = await payPayrollEmployeeLine(batchId, employeeId, source);
          if (res.ok) {
            const fresh = useErpStore.getState().payrollBatches.find((b) => b.id === batchId);
            if (fresh) setEditTarget(fresh);
          }
          return res;
        }}
        onSave={async (batchId, patches) => {
          const res = await updatePayrollBatchLines(batchId, patches);
          if (!res.ok) {
            toast.error(res.error ?? 'تعذّر الحفظ');
            throw new Error(res.error);
          }
          const fresh = useErpStore.getState().payrollBatches.find((b) => b.id === batchId);
          if (fresh) setEditTarget(fresh);
        }}
        onPay={
          editTarget && editTarget.status !== 'paid'
            ? () => {
                const batchId = editTarget.id;
                const fresh = useErpStore.getState().payrollBatches.find((b) => b.id === batchId);
                setPayTarget(fresh ?? editTarget);
                setEditTarget(null);
              }
            : undefined
        }
        canDelete={editTarget ? canDeleteBatch(editTarget) : false}
        onDelete={
          editTarget
            ? () => handleDeleteBatch(editTarget, { skipConfirm: true })
            : undefined
        }
      />

      <PayrollPayDialog
        batch={payTarget}
        onClose={() => setPayTarget(null)}
        vaults={vaults}
        banks={banks}
        cashMovements={cashMovements}
        onPay={async (batchId, source) => {
          const res = await payPayrollBatch(batchId, source);
          if (res.ok) {
            toast.success('تم صرف الرواتب');
            setPayTarget(null);
          } else toast.error(res.error ?? 'تعذّر الصرف');
        }}
      />

      {/* زر عائم — كشف رواتب على الجوال */}
      {mobileSection === 'payroll' && active.length > 0 ? (
        <div className="fixed inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] z-40 md:hidden">
          <Button size="sm" className="w-full shadow-whisper" onClick={() => setBatchOpen(true)}>
            <BadgeDollarSign className="size-3.5" />
            كشف رواتب جديد
          </Button>
        </div>
      ) : null}
    </div>
  );
}
