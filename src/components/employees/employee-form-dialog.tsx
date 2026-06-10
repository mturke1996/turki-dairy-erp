'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/shared/field';
import { AmountInput } from '@/components/shared/amount-input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PayoutSourceSelect } from '@/components/employees/payout-source-select';
import {
  CONTRACT_TYPE_LABELS,
  DEPARTMENT_LABELS,
  EMPLOYEE_STATUS_LABELS,
  SALARY_BASE_LABELS,
  SALARY_TYPE_HINTS,
  SALARY_TYPE_LABELS,
} from '@/lib/domain/constants';
import { parsePayoutAccountValue, payoutAccountValue, previewSalaryFromForm } from '@/lib/domain/payroll';
import { SalaryFormPreview } from '@/components/employees/salary-form-preview';
import type {
  BankAccount,
  CashVault,
  ContractType,
  Department,
  Employee,
  EmployeeStatus,
  SalaryType,
} from '@/lib/domain/types';

type EmployeeInput = Omit<Employee, 'id' | 'code' | 'createdAt'>;

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  vaults,
  banks,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employee?: Employee | null;
  vaults: CashVault[];
  banks: BankAccount[];
  onSubmit: (input: EmployeeInput) => void;
}) {
  const isEdit = Boolean(employee);

  const [form, setForm] = useState({
    fullName: '',
    jobTitle: '',
    department: 'operations' as Department,
    salaryType: 'half_month' as SalaryType,
    baseSalary: '',
    housing: '',
    transport: '',
    food: '',
    contractType: 'permanent' as ContractType,
    phone: '',
    nationalId: '',
    hireDate: new Date().toISOString().slice(0, 10),
    status: 'active' as EmployeeStatus,
    payoutAccount: '',
  });

  const baseLabel = SALARY_BASE_LABELS[form.salaryType];

  useEffect(() => {
    if (!open) return;
    if (employee) {
      setForm({
        fullName: employee.fullName,
        jobTitle: employee.jobTitle,
        department: employee.department,
        salaryType: employee.salaryType ?? 'monthly',
        baseSalary: String(employee.baseSalary),
        housing: String(employee.allowances.housing),
        transport: String(employee.allowances.transport),
        food: String(employee.allowances.food),
        contractType: employee.contractType,
        phone: employee.phone,
        nationalId: employee.nationalId ?? '',
        hireDate: employee.hireDate.slice(0, 10),
        status: employee.status,
        payoutAccount:
          employee.defaultPayoutType && employee.defaultPayoutId
            ? payoutAccountValue(employee.defaultPayoutType, employee.defaultPayoutId)
            : '',
      });
    } else {
      setForm({
        fullName: '',
        jobTitle: '',
        department: 'operations',
        salaryType: 'half_month',
        baseSalary: '',
        housing: '',
        transport: '',
        food: '',
        contractType: 'permanent',
        phone: '',
        nationalId: '',
        hireDate: new Date().toISOString().slice(0, 10),
        status: 'active',
        payoutAccount: '',
      });
    }
  }, [open, employee]);

  const salaryHint = SALARY_TYPE_HINTS[form.salaryType];

  const salaryPreview = useMemo(
    () =>
      previewSalaryFromForm({
        salaryType: form.salaryType,
        baseSalary: Number(form.baseSalary) || 0,
        allowances: {
          housing: Number(form.housing) || 0,
          transport: Number(form.transport) || 0,
          food: Number(form.food) || 0,
        },
      }),
    [form.salaryType, form.baseSalary, form.housing, form.transport, form.food],
  );

  function submit() {
    if (!form.fullName.trim()) return toast.error('أدخل اسم الموظف');
    if (!form.jobTitle.trim()) return toast.error('أدخل المسمّى الوظيفي');
    const parsed = form.payoutAccount ? parsePayoutAccountValue(form.payoutAccount) : null;
    onSubmit({
      fullName: form.fullName.trim(),
      jobTitle: form.jobTitle.trim(),
      department: form.department,
      salaryType: form.salaryType,
      baseSalary: Number(form.baseSalary) || 0,
      allowances: {
        housing: Number(form.housing) || 0,
        transport: Number(form.transport) || 0,
        food: Number(form.food) || 0,
      },
      hireDate: form.hireDate,
      contractType: form.contractType,
      phone: form.phone.trim(),
      nationalId: form.nationalId.trim() || undefined,
      status: form.status,
      defaultPayoutType: parsed?.type,
      defaultPayoutId: parsed?.id,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <div className="border-b border-border px-6 py-5">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'تعديل الموظف' : 'موظف جديد'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'تحديث بيانات الموظف ونوع الراتب ومصدر الصرف.' : 'أدخل بيانات الموظف ونوع احتساب الراتب.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[min(72vh,520px)] space-y-4 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="الاسم الكامل" required>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </Field>
            <Field label="المسمّى الوظيفي" required>
              <Input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="القسم">
              <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v as Department })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(DEPARTMENT_LABELS) as Department[]).map((d) => (
                    <SelectItem key={d} value={d}>{DEPARTMENT_LABELS[d]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="نوع العقد">
              <Select value={form.contractType} onValueChange={(v) => setForm({ ...form, contractType: v as ContractType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CONTRACT_TYPE_LABELS) as ContractType[]).map((c) => (
                    <SelectItem key={c} value={c}>{CONTRACT_TYPE_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="نوع الراتب" hint={salaryHint}>
            <Select
              value={form.salaryType}
              onValueChange={(v) => setForm({ ...form, salaryType: v as SalaryType })}
            >
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(SALARY_TYPE_LABELS) as SalaryType[]).map((t) => (
                  <SelectItem key={t} value={t}>{SALARY_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {isEdit ? (
            <Field label="الحالة">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as EmployeeStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(EMPLOYEE_STATUS_LABELS) as EmployeeStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{EMPLOYEE_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Field label={baseLabel} required>
              <AmountInput value={form.baseSalary} onChange={(v) => setForm({ ...form, baseSalary: v })} />
            </Field>
            <Field label="الهاتف">
              <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="الرقم الوطني">
              <Input dir="ltr" value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
            </Field>
            <Field label="تاريخ التعيين">
              <Input type="date" dir="ltr" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
            </Field>
          </div>

          <div className="rounded-xl border border-border bg-canvas-sunken/50 p-3">
            <p className="mb-3 text-[11px] font-semibold text-muted-foreground">
              {salaryPreview.allowanceSectionLabel}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="سكن"><AmountInput value={form.housing} onChange={(v) => setForm({ ...form, housing: v })} /></Field>
              <Field label="نقل"><AmountInput value={form.transport} onChange={(v) => setForm({ ...form, transport: v })} /></Field>
              <Field label="طعام"><AmountInput value={form.food} onChange={(v) => setForm({ ...form, food: v })} /></Field>
            </div>
          </div>

          <SalaryFormPreview preview={salaryPreview} />

          <Field label="خزنة / بنك الصرف الافتراضي" hint="يُقترح تلقائياً عند إنشاء كشف الرواتب">
            <PayoutSourceSelect
              value={form.payoutAccount}
              onChange={(v) => setForm({ ...form, payoutAccount: v })}
              vaults={vaults}
              banks={banks}
              placeholder="اختياري — بدون تحديد"
            />
          </Field>
        </div>

        <DialogFooter className="border-t border-border bg-canvas-sunken/40 px-6 py-4">
          <Button onClick={submit}>
            <Plus className="h-4 w-4" />
            {isEdit ? 'حفظ التعديلات' : 'إضافة الموظف'}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
