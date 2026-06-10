'use client';

import { ChevronLeft, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Money } from '@/components/shared/money';
import {
  DEPARTMENT_LABELS,
  EMPLOYEE_STATUS_LABELS,
  SALARY_TYPE_LABELS,
} from '@/lib/domain/constants';
import type { Department, EmployeeStatus, SalaryType } from '@/lib/domain/types';
import { cn } from '@/lib/utils';

export type EmployeeListItem = {
  id: string;
  fullName: string;
  code: string;
  jobTitle: string;
  department: Department;
  status: EmployeeStatus;
  salaryType: SalaryType;
  grossSalary: number;
  advanceBalance: number;
  phone: string;
};

const STATUS_VARIANT: Record<EmployeeStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  on_leave: 'warning',
  terminated: 'neutral',
};

function employeeInitial(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return parts[0].charAt(0) + parts[1].charAt(0);
  return name.charAt(0) || 'م';
}

export function EmployeeListCard({
  employee,
  onClick,
  className,
}: {
  employee: EmployeeListItem;
  onClick: () => void;
  className?: string;
}) {
  const hasDebt = employee.advanceBalance > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative w-full overflow-hidden rounded-xl border border-border bg-card p-4 text-right shadow-whisper',
        'transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.99] active:bg-canvas-sunken/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        hasDebt && 'ring-1 ring-inset ring-rose-200',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[15px] font-bold ring-1',
            employee.status === 'active'
              ? 'bg-navy-50 text-navy-800 ring-navy-100'
              : employee.status === 'on_leave'
                ? 'bg-sun-50 text-sun-900 ring-sun-100'
                : 'bg-canvas-sunken text-muted-foreground ring-border',
          )}
          aria-hidden
        >
          {employeeInitial(employee.fullName)}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold leading-snug text-foreground">{employee.fullName}</p>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                <span className="font-mono tabular-nums" dir="ltr">{employee.code}</span>
                <span className="text-border"> · </span>
                {employee.jobTitle}
              </p>
            </div>
            <ChevronLeft className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50 transition group-hover:text-muted-foreground" />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <Badge variant={STATUS_VARIANT[employee.status]} className="text-[10px]">
              {EMPLOYEE_STATUS_LABELS[employee.status]}
            </Badge>
            <Badge variant="info" className="text-[10px]">
              {SALARY_TYPE_LABELS[employee.salaryType]}
            </Badge>
            <Badge variant="neutral" className="text-[10px]">
              {DEPARTMENT_LABELS[employee.department]}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-canvas-sunken/60 p-2.5">
        <div>
          <p className="text-[10.5px] font-medium text-muted-foreground">الأجر</p>
          <Money value={employee.grossSalary} decimals={0} className="mt-0.5 text-[14px] font-semibold" />
        </div>
        <div className="border-s border-border/80 ps-2.5">
          <p className="text-[10.5px] font-medium text-muted-foreground">الدين</p>
          <Money
            value={employee.advanceBalance}
            decimals={0}
            className={cn('mt-0.5 text-[14px] font-bold', hasDebt ? 'text-rose-700' : 'text-muted-foreground')}
          />
        </div>
      </div>

      {employee.phone ? (
        <p className="mt-2 flex items-center justify-end gap-1 text-[11px] text-muted-foreground" dir="ltr">
          <Phone className="h-3 w-3 shrink-0" />
          {employee.phone}
        </p>
      ) : null}
    </button>
  );
}

export function EmployeeStatusChips({
  value,
  onChange,
  counts,
}: {
  value: 'all' | EmployeeStatus;
  onChange: (v: 'all' | EmployeeStatus) => void;
  counts: { all: number; active: number; on_leave: number; terminated: number };
}) {
  const items: { key: 'all' | EmployeeStatus; label: string; count: number }[] = [
    { key: 'all', label: 'الكل', count: counts.all },
    { key: 'active', label: EMPLOYEE_STATUS_LABELS.active, count: counts.active },
    { key: 'on_leave', label: EMPLOYEE_STATUS_LABELS.on_leave, count: counts.on_leave },
    { key: 'terminated', label: EMPLOYEE_STATUS_LABELS.terminated, count: counts.terminated },
  ];

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar md:hidden">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={cn(
            'shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors',
            value === item.key
              ? 'bg-navy-700 text-white shadow-whisper'
              : 'bg-canvas-sunken text-muted-foreground ring-1 ring-border hover:text-foreground',
          )}
        >
          {item.label}
          <span className={cn('ms-1.5 tabular-nums', value === item.key ? 'text-white/80' : 'text-muted-foreground/80')}>
            {item.count}
          </span>
        </button>
      ))}
    </div>
  );
}
