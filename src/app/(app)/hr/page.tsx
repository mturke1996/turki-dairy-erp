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
import { Field } from '@/components/shared/field';
import { Money, moneyText } from '@/components/shared/money';
import { StatTile } from '@/components/shared/stat-tile';
import { EmptyState } from '@/components/shared/empty-state';
import { EmployeeFormDialog } from '@/components/employees/employee-form-dialog';
import { EmployeeDetailDialog } from '@/components/employees/employee-detail-dialog';
import { EmployeeListCard, EmployeeStatusChips } from '@/components/employees/employee-list-card';
import { PayrollBatchCard } from '@/components/employees/payroll-batch-card';
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
import { TurkiPdfToolbar } from '@/features/pdf/pdf-toolbar';
import { PayrollPDF, type PayrollLineRow } from '@/features/pdf/PayrollPDF';
import { useErpStore } from '@/lib/store/use-erp-store';
import { usePermission } from '@/lib/store/use-permission';
import {
  DEPARTMENT_LABELS,
  EMPLOYEE_STATUS_LABELS,
  PAYROLL_STATUS_LABELS,
} from '@/lib/domain/constants';
import type {
  AccountSourceType,
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
  const batches = useErpStore((s) => s.payrollBatches);
  const vaults = useErpStore((s) => s.vaults);
  const banks = useErpStore((s) => s.banks);
  const addEmployee = useErpStore((s) => s.addEmployee);
  const createPayrollBatch = useErpStore((s) => s.createPayrollBatch);
  const payPayrollBatch = useErpStore((s) => s.payPayrollBatch);
  const canPay = usePermission('payroll.pay');

  function buildPayrollProps(b: PayrollBatch) {
    const rows: PayrollLineRow[] = b.lines.map((l) => {
      const emp = employees.find((e) => e.id === l.employeeId);
      return {
        name: emp?.fullName ?? 'موظف',
        jobTitle: emp?.jobTitle ?? '',
        base: l.baseSalary,
        allowances: l.allowancesTotal,
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
  const monthlyLabor = useMemo(
    () => active.reduce((s, e) => s + e.baseSalary + e.allowances.housing + e.allowances.transport + e.allowances.food, 0),
    [active],
  );
  const lastPaid = useMemo(
    () => batches.filter((b) => b.status === 'paid').sort((a, b) => +new Date(b.paidAt ?? 0) - +new Date(a.paidAt ?? 0))[0],
    [batches],
  );
  const totalPaid = useMemo(() => batches.filter((b) => b.status === 'paid').reduce((s, b) => s + b.totalAmount, 0), [batches]);

  const [empOpen, setEmpOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<PayrollBatch | null>(null);
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
        description="إدارة الكوادر وكشوف الرواتب — الصرف يُنشئ حركة نقدية تلقائياً."
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
        <StatTile label="كلفة شهرية" value={<Money value={monthlyLabor} decimals={0} />} icon={Users} tone="navy" hint="رواتب النشطين" />
        <StatTile label="آخر صرف" value={lastPaid ? <Money value={lastPaid.totalAmount} decimals={0} /> : '—'} icon={CalendarClock} tone="sun" hint={lastPaid?.paidAt ? formatShortDate(lastPaid.paidAt) : 'لم يُصرف'} />
        <StatTile label="إجمالي المصروف" value={<Money value={totalPaid} decimals={0} />} icon={Wallet} tone="neutral" hint="كل الكشوف" />
      </div>

      {/* تبويب جوال — الكوادر / كشوف الرواتب */}
      <div className="flex gap-2 rounded-xl border border-border bg-canvas-sunken/40 p-1 md:hidden">
        {(
          [
            { key: 'staff' as const, label: 'الكوادر', count: employees.length },
            { key: 'payroll' as const, label: 'كشوف الرواتب', count: batches.length },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setMobileSection(tab.key)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-semibold transition-colors',
              mobileSection === tab.key
                ? 'bg-card text-foreground shadow-whisper ring-1 ring-border'
                : 'text-muted-foreground',
            )}
          >
            {tab.label}
            <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] tabular-nums', mobileSection === tab.key ? 'bg-navy-50 text-navy-700' : 'bg-transparent')}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* الموظفون */}
      <Card className={cn('overflow-hidden', mobileSection !== 'staff' && 'hidden md:block')}>
        <CardHeader className="hidden pb-3 md:block">
          <CardTitle>الكوادر</CardTitle>
          <CardDescription>قائمة الموظفين وبيانات الراتب والديون</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4 md:pt-0">
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
                {filteredEmployees.map((e) => {
                  const allowances = e.allowances.housing + e.allowances.transport + e.allowances.food;
                  return (
                    <EmployeeListCard
                      key={e.id}
                      employee={{
                        id: e.id,
                        fullName: e.fullName,
                        code: e.code,
                        jobTitle: e.jobTitle,
                        department: e.department,
                        status: e.status,
                        grossSalary: e.baseSalary + allowances,
                        advanceBalance: e.advanceBalance,
                        phone: e.phone,
                      }}
                      onClick={() => setDetailId(e.id)}
                    />
                  );
                })}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الموظف</TableHead>
                      <TableHead>المسمّى</TableHead>
                      <TableHead>القسم</TableHead>
                      <TableHead className="text-left">الراتب الأساسي</TableHead>
                      <TableHead className="text-left">الصافي</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((e) => {
                      const allowances = e.allowances.housing + e.allowances.transport + e.allowances.food;
                      return (
                        <TableRow key={e.id} className="cursor-pointer" onClick={() => setDetailId(e.id)}>
                          <TableCell>
                            <p className="text-[12.5px] font-medium">{e.fullName}</p>
                            <p className="text-[11px] text-muted-foreground" dir="ltr">{e.code}</p>
                          </TableCell>
                          <TableCell className="text-[12.5px]">{e.jobTitle}</TableCell>
                          <TableCell className="text-[12px] text-muted-foreground">{DEPARTMENT_LABELS[e.department]}</TableCell>
                          <TableCell className="text-left"><Money value={e.baseSalary} decimals={0} /></TableCell>
                          <TableCell className="text-left"><Money value={e.baseSalary + allowances} decimals={0} className="font-semibold" /></TableCell>
                          <TableCell>
                            <div className="flex flex-col items-center gap-1">
                              <Badge variant={EMP_STATUS_VARIANT[e.status]}>{EMPLOYEE_STATUS_LABELS[e.status]}</Badge>
                              {e.advanceBalance > 0 ? (
                                <span className="text-[10.5px] text-rose-700">دين <Money value={e.advanceBalance} decimals={0} className="inline text-[10.5px]" /></span>
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
          ) : (
            <EmptyState icon={Users} title="لا موظفين مطابقين" description="جرّب تعديل البحث أو الفلتر." />
          )}
        </CardContent>
      </Card>

      {/* كشوف الرواتب */}
      <Card className={cn('overflow-hidden', mobileSection !== 'payroll' && 'hidden md:block')}>
        <CardHeader className="hidden pb-3 md:block">
          <CardTitle>كشوف الرواتب</CardTitle>
          <CardDescription>الكشوف المنشأة وحالتها</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 md:pt-6">
          {batches.length === 0 ? (
            <EmptyState icon={BadgeDollarSign} title="لا توجد كشوف" description="أنشئ كشف رواتب من الموظفين النشطين." />
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {batches.map((b) => (
                  <PayrollBatchCard
                    key={b.id}
                    batch={b}
                    canPay={canPay}
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
                  <TableHead>الفترة</TableHead>
                  <TableHead className="text-center">الموظفون</TableHead>
                  <TableHead className="text-left">الإجمالي</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-left">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <p className="text-[12.5px] font-medium">{b.label}</p>
                      <p className="text-[11px] text-muted-foreground" dir="ltr">{b.ref}</p>
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground" dir="ltr">
                      {formatShortDate(b.periodFrom)} — {formatShortDate(b.periodTo)}
                    </TableCell>
                    <TableCell className="text-center text-[12.5px]">{b.lines.length}</TableCell>
                    <TableCell className="text-left"><Money value={b.totalAmount} decimals={0} className="font-semibold" /></TableCell>
                    <TableCell><Badge variant={PR_STATUS_VARIANT[b.status]}>{PAYROLL_STATUS_LABELS[b.status]}</Badge></TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center justify-end gap-2">
                        <TurkiPdfToolbar
                          fileName={`كشف-رواتب-${b.label}`}
                          label="تقرير"
                          variant="outline"
                          showDownload={false}
                          render={async () => <PayrollPDF {...buildPayrollProps(b)} />}
                        />
                        {b.status !== 'paid' ? (
                          <Button size="sm" variant="outline" disabled={!canPay} onClick={() => setPayTarget(b)}>
                            <Wallet className="h-3.5 w-3.5" />
                            صرف
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
        onSubmit={async (input) => {
          const res = await addEmployee(input);
          if (res.ok) {
            toast.success('تمت إضافة الموظف');
            setEmpOpen(false);
          } else toast.error(res.error ?? 'تعذّرت الإضافة');
        }}
      />

      <EmployeeDetailDialog employeeId={detailId} open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)} />

      <BatchDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        count={active.length}
        onSubmit={(input) => {
          const res = createPayrollBatch(input);
          if (res.ok) {
            toast.success('تم إنشاء كشف الرواتب');
            setBatchOpen(false);
          } else toast.error(res.error ?? 'تعذّر الإنشاء');
        }}
      />

      <PayDialog
        batch={payTarget}
        onClose={() => setPayTarget(null)}
        vaults={vaults}
        banks={banks}
        onPay={(batchId, source) => {
          const res = payPayrollBatch(batchId, source);
          if (res.ok) {
            toast.success('تم صرف الرواتب');
            setPayTarget(null);
          } else toast.error(res.error ?? 'تعذّر الصرف');
        }}
      />
    </div>
  );
}

function BatchDialog({
  open,
  onOpenChange,
  count,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  count: number;
  onSubmit: (input: { label: string; payrollType: 'monthly' | 'bi_monthly'; periodFrom: string; periodTo: string }) => void;
}) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<'monthly' | 'bi_monthly'>('bi_monthly');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  function submit() {
    if (!label.trim()) return toast.error('أدخل عنوان الكشف');
    onSubmit({ label: label.trim(), payrollType: type, periodFrom: from || new Date().toISOString().slice(0, 10), periodTo: to || new Date().toISOString().slice(0, 10) });
    setLabel(''); setFrom(''); setTo('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>كشف رواتب جديد</DialogTitle>
          <DialogDescription>سيُنشأ الكشف لـ {count} موظف نشط بصافي الراتب الحالي.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="عنوان الكشف" required><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="رواتب يونيو 2026 — النصف الثاني" /></Field>
          <Field label="نوع الكشف">
            <Select value={type} onValueChange={(v) => setType(v as 'monthly' | 'bi_monthly')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bi_monthly">نصف شهري</SelectItem>
                <SelectItem value="monthly">شهري</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="من تاريخ"><Input type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="إلى تاريخ"><Input type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit}><BadgeDollarSign className="h-4 w-4" />إنشاء الكشف</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayDialog({
  batch,
  onClose,
  vaults,
  banks,
  onPay,
}: {
  batch: PayrollBatch | null;
  onClose: () => void;
  vaults: { id: string; name: string }[];
  banks: { id: string; bankName: string }[];
  onPay: (batchId: string, source: { type: AccountSourceType; id: string }) => void;
}) {
  const options = useMemo(
    () => [
      ...vaults.map((v) => ({ value: `vault:${v.id}`, label: `خزنة: ${v.name}` })),
      ...banks.map((b) => ({ value: `bank:${b.id}`, label: `بنك: ${b.bankName}` })),
    ],
    [vaults, banks],
  );
  const [account, setAccount] = useState('');

  return (
    <Dialog open={!!batch} onOpenChange={(o) => { if (!o) { onClose(); setAccount(''); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>صرف الرواتب</DialogTitle>
          <DialogDescription>
            {batch ? `${batch.label} — الإجمالي ${moneyText(batch.totalAmount, 0)}` : ''}
          </DialogDescription>
        </DialogHeader>
        <Field label="مصدر الصرف" required>
          <Select value={account} onValueChange={setAccount}>
            <SelectTrigger><SelectValue placeholder="اختر خزنة أو بنك" /></SelectTrigger>
            <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <DialogFooter>
          <Button
            onClick={() => {
              if (!batch) return;
              if (!account) return toast.error('اختر مصدر الصرف');
              const [type, id] = account.split(':') as [AccountSourceType, string];
              onPay(batch.id, { type, id });
              setAccount('');
            }}
          >
            <Wallet className="h-4 w-4" />تأكيد الصرف
          </Button>
          <Button variant="ghost" onClick={() => { onClose(); setAccount(''); }}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
