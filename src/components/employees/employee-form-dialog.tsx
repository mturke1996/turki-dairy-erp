'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/shared/field';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CONTRACT_TYPE_LABELS, DEPARTMENT_LABELS, EMPLOYEE_STATUS_LABELS } from '@/lib/domain/constants';
import type { ContractType, Department, Employee, EmployeeStatus } from '@/lib/domain/types';

type EmployeeInput = Omit<Employee, 'id' | 'code' | 'createdAt'>;

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employee?: Employee | null;
  onSubmit: (input: EmployeeInput) => void;
}) {
  const isEdit = Boolean(employee);

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
    nationalId: '',
    hireDate: new Date().toISOString().slice(0, 10),
    status: 'active' as EmployeeStatus,
  });

  useEffect(() => {
    if (!open) return;
    if (employee) {
      setForm({
        fullName: employee.fullName,
        jobTitle: employee.jobTitle,
        department: employee.department,
        baseSalary: String(employee.baseSalary),
        housing: String(employee.allowances.housing),
        transport: String(employee.allowances.transport),
        food: String(employee.allowances.food),
        contractType: employee.contractType,
        phone: employee.phone,
        nationalId: employee.nationalId ?? '',
        hireDate: employee.hireDate.slice(0, 10),
        status: employee.status,
      });
    } else {
      setForm({
        fullName: '',
        jobTitle: '',
        department: 'operations',
        baseSalary: '',
        housing: '',
        transport: '',
        food: '',
        contractType: 'permanent',
        phone: '',
        nationalId: '',
        hireDate: new Date().toISOString().slice(0, 10),
        status: 'active',
      });
    }
  }, [open, employee]);

  function submit() {
    if (!form.fullName.trim()) return toast.error('أدخل اسم الموظف');
    if (!form.jobTitle.trim()) return toast.error('أدخل المسمّى الوظيفي');
    onSubmit({
      fullName: form.fullName.trim(),
      jobTitle: form.jobTitle.trim(),
      department: form.department,
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
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'تعديل الموظف' : 'موظف جديد'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'تحديث بيانات الموظف والراتب.' : 'أدخل بيانات الموظف والراتب الأساسي.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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
            <Field label="الراتب الأساسي" required>
              <Input type="number" dir="ltr" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} />
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
          <div className="grid grid-cols-3 gap-3">
            <Field label="بدل سكن"><Input type="number" dir="ltr" value={form.housing} onChange={(e) => setForm({ ...form, housing: e.target.value })} /></Field>
            <Field label="بدل نقل"><Input type="number" dir="ltr" value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value })} /></Field>
            <Field label="بدل طعام"><Input type="number" dir="ltr" value={form.food} onChange={(e) => setForm({ ...form, food: e.target.value })} /></Field>
          </div>
        </div>
        <DialogFooter>
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
