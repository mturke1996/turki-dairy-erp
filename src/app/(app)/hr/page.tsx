'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Users, Plus, Wallet, BadgeDollarSign, CalendarClock, UserCheck } from 'lucide-react';
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
  CONTRACT_TYPE_LABELS,
  EMPLOYEE_STATUS_LABELS,
  PAYROLL_STATUS_LABELS,
} from '@/lib/domain/constants';
import type {
  AccountSourceType,
  ContractType,
  Department,
  EmployeeStatus,
  PayrollBatch,
} from '@/lib/domain/types';
import { formatShortDate } from '@/lib/utils';

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
  const employees = useErpStore((s) => s.employees);
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="المالية"
        title="الموظفون والرواتب"
        description="إدارة الكوادر وكشوف الرواتب — الصرف يُنشئ حركة نقدية تلقائياً من الحساب المختار."
        actions={
          <>
            <Button variant="outline" onClick={() => setEmpOpen(true)}>
              <Plus className="h-4 w-4" />
              موظف جديد
            </Button>
            <Button onClick={() => setBatchOpen(true)} disabled={active.length === 0}>
              <BadgeDollarSign className="h-4 w-4" />
              كشف رواتب
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="الموظفون النشطون" value={active.length} icon={UserCheck} tone="meadow" hint={`${employees.length} إجمالي`} />
        <StatTile label="كلفة الرواتب الشهرية" value={<Money value={monthlyLabor} decimals={0} />} icon={Users} tone="navy" hint="صافي رواتب النشطين" />
        <StatTile label="آخر صرف" value={lastPaid ? <Money value={lastPaid.totalAmount} decimals={0} /> : '—'} icon={CalendarClock} tone="sun" hint={lastPaid?.paidAt ? formatShortDate(lastPaid.paidAt) : 'لم يتم صرف'} />
        <StatTile label="إجمالي المصروف" value={<Money value={totalPaid} decimals={0} />} icon={Wallet} tone="neutral" hint="كل كشوف الرواتب" />
      </div>

      {/* الموظفون */}
      <Card>
        <CardHeader>
          <CardTitle>الكوادر</CardTitle>
          <CardDescription>قائمة الموظفين وبيانات الراتب الأساسي</CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <EmptyState icon={Users} title="لا يوجد موظفون" description="أضف أول موظف لبدء إدارة الرواتب." />
          ) : (
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
                {employees.map((e) => {
                  const allowances = e.allowances.housing + e.allowances.transport + e.allowances.food;
                  return (
                    <TableRow key={e.id}>
                      <TableCell>
                        <p className="text-[12.5px] font-medium">{e.fullName}</p>
                        <p className="text-[11px] text-muted-foreground" dir="ltr">{e.code}</p>
                      </TableCell>
                      <TableCell className="text-[12.5px]">{e.jobTitle}</TableCell>
                      <TableCell className="text-[12px] text-muted-foreground">{DEPARTMENT_LABELS[e.department]}</TableCell>
                      <TableCell className="text-left"><Money value={e.baseSalary} decimals={0} /></TableCell>
                      <TableCell className="text-left"><Money value={e.baseSalary + allowances} decimals={0} className="font-semibold" /></TableCell>
                      <TableCell><Badge variant={EMP_STATUS_VARIANT[e.status]}>{EMPLOYEE_STATUS_LABELS[e.status]}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* كشوف الرواتب */}
      <Card>
        <CardHeader>
          <CardTitle>كشوف الرواتب</CardTitle>
          <CardDescription>الكشوف المنشأة وحالتها</CardDescription>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <EmptyState icon={BadgeDollarSign} title="لا توجد كشوف" description="أنشئ كشف رواتب من الموظفين النشطين." />
          ) : (
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
          )}
        </CardContent>
      </Card>

      <EmployeeDialog
        open={empOpen}
        onOpenChange={setEmpOpen}
        onSubmit={(input) => {
          const res = addEmployee(input);
          if (res.ok) {
            toast.success('تمت إضافة الموظف');
            setEmpOpen(false);
          } else toast.error(res.error ?? 'تعذّرت الإضافة');
        }}
      />

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

function EmployeeDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (input: {
    fullName: string;
    jobTitle: string;
    department: Department;
    baseSalary: number;
    allowances: { housing: number; transport: number; food: number };
    hireDate: string;
    contractType: ContractType;
    phone: string;
    status: EmployeeStatus;
  }) => void;
}) {
  const [form, setForm] = useState({
    fullName: '',
    jobTitle: '',
    department: 'operations' as Department,
    baseSalary: '',
    housing: '',
    transport: '',
    food: '',
    contractType: 'permanent' as ContractType,
    phone: '',
  });

  function submit() {
    if (!form.fullName.trim()) return toast.error('أدخل اسم الموظف');
    if (!form.jobTitle.trim()) return toast.error('أدخل المسمّى الوظيفي');
    onSubmit({
      fullName: form.fullName.trim(),
      jobTitle: form.jobTitle.trim(),
      department: form.department,
      baseSalary: Number(form.baseSalary) || 0,
      allowances: { housing: Number(form.housing) || 0, transport: Number(form.transport) || 0, food: Number(form.food) || 0 },
      hireDate: new Date().toISOString().slice(0, 10),
      contractType: form.contractType,
      phone: form.phone.trim(),
      status: 'active',
    });
    setForm({ fullName: '', jobTitle: '', department: 'operations', baseSalary: '', housing: '', transport: '', food: '', contractType: 'permanent', phone: '' });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>موظف جديد</DialogTitle>
          <DialogDescription>أدخل بيانات الموظف والراتب الأساسي.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="الاسم الكامل" required><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
            <Field label="المسمّى الوظيفي" required><Input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="القسم">
              <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v as Department })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(DEPARTMENT_LABELS) as Department[]).map((d) => <SelectItem key={d} value={d}>{DEPARTMENT_LABELS[d]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="نوع العقد">
              <Select value={form.contractType} onValueChange={(v) => setForm({ ...form, contractType: v as ContractType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(CONTRACT_TYPE_LABELS) as ContractType[]).map((c) => <SelectItem key={c} value={c}>{CONTRACT_TYPE_LABELS[c]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الراتب الأساسي" required><Input type="number" dir="ltr" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} /></Field>
            <Field label="الهاتف"><Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="بدل سكن"><Input type="number" dir="ltr" value={form.housing} onChange={(e) => setForm({ ...form, housing: e.target.value })} /></Field>
            <Field label="بدل نقل"><Input type="number" dir="ltr" value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value })} /></Field>
            <Field label="بدل طعام"><Input type="number" dir="ltr" value={form.food} onChange={(e) => setForm({ ...form, food: e.target.value })} /></Field>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit}><Plus className="h-4 w-4" />إضافة الموظف</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
