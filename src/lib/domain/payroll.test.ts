import { describe, expect, it } from 'vitest';
import {
  buildPayrollLine,
  employeeMonthlyEquivalent,
  payrollTypeForSalaryType,
  salaryTypeMatchesBatch,
} from '@/lib/domain/payroll';
import type { Employee } from '@/lib/domain/types';

function emp(partial: Partial<Employee> & Pick<Employee, 'id' | 'baseSalary'>): Employee {
  const { id, baseSalary, ...rest } = partial;
  return {
    code: 'E-001',
    fullName: 'موظف',
    jobTitle: 'عامل',
    department: 'operations',
    salaryType: 'monthly',
    allowances: { housing: 0, transport: 0, food: 0 },
    hireDate: '2024-01-01',
    contractType: 'permanent',
    phone: '',
    status: 'active',
    createdAt: '2024-01-01',
    ...rest,
    id,
    baseSalary,
  };
}

describe('salary type mapping', () => {
  it('maps employee salary types to payroll batch types', () => {
    expect(payrollTypeForSalaryType('monthly')).toBe('monthly');
    expect(payrollTypeForSalaryType('half_month')).toBe('bi_monthly');
    expect(payrollTypeForSalaryType('daily')).toBe('daily');
  });

  it('filters employees by matching batch type', () => {
    expect(salaryTypeMatchesBatch('monthly', 'monthly')).toBe(true);
    expect(salaryTypeMatchesBatch('half_month', 'bi_monthly')).toBe(true);
    expect(salaryTypeMatchesBatch('daily', 'daily')).toBe(true);
    expect(salaryTypeMatchesBatch('daily', 'monthly')).toBe(false);
  });
});

describe('payroll line calculation', () => {
  it('pays full monthly salary minus advance', () => {
    const line = buildPayrollLine({
      employee: emp({
        id: 'e1',
        baseSalary: 3000,
        allowances: { housing: 300, transport: 200, food: 100 },
        salaryType: 'monthly',
      }),
      batchType: 'monthly',
      periodFrom: '2026-06-01',
      periodTo: '2026-06-30',
      advanceBalance: 500,
    });
    expect(line.grossSalary).toBe(3600);
    expect(line.netSalary).toBe(3100);
    expect(line.advanceDeducted).toBe(500);
    expect(line.debtBefore).toBe(500);
  });

  it('carries debt forward and pays full salary with bonus', () => {
    const line = buildPayrollLine({
      employee: emp({ id: 'e4', baseSalary: 2000, salaryType: 'monthly' }),
      batchType: 'monthly',
      periodFrom: '2026-06-01',
      periodTo: '2026-06-30',
      advanceBalance: 800,
      bonusAmount: 200,
      debtMode: 'carry_forward',
    });
    expect(line.netSalary).toBe(2200);
    expect(line.advanceDeducted).toBe(0);
    expect(line.debtCarriedForward).toBe(800);
    expect(line.bonusAmount).toBe(200);
  });

  it('pays half-month at 50% of monthly package', () => {
    const line = buildPayrollLine({
      employee: emp({
        id: 'e2',
        baseSalary: 2000,
        allowances: { housing: 200, transport: 100, food: 100 },
        salaryType: 'half_month',
      }),
      batchType: 'bi_monthly',
      periodFrom: '2026-06-01',
      periodTo: '2026-06-15',
      advanceBalance: 0,
    });
    expect(line.netSalary).toBe(1200);
  });

  it('multiplies daily rate by attendance days', () => {
    const line = buildPayrollLine({
      employee: emp({
        id: 'e3',
        baseSalary: 100,
        allowances: { housing: 0, transport: 30, food: 0 },
        salaryType: 'daily',
      }),
      batchType: 'daily',
      periodFrom: '2026-06-01',
      periodTo: '2026-06-10',
      advanceBalance: 0,
    });
    expect(line.attendanceDays).toBe(10);
    expect(line.netSalary).toBeGreaterThan(900);
  });
});

describe('payroll batch totals', () => {
  it('keeps gross = deducted + net for deduct mode', () => {
    const line = buildPayrollLine({
      employee: emp({ id: 'e5', baseSalary: 1500, salaryType: 'monthly' }),
      batchType: 'monthly',
      periodFrom: '2026-06-01',
      periodTo: '2026-06-30',
      advanceBalance: 400,
      bonusAmount: 100,
      debtMode: 'deduct',
    });
    expect(line.grossSalary + line.bonusAmount).toBe(line.advanceDeducted + line.netSalary);
  });

  it('carry forward pays full net without deducting', () => {
    const line = buildPayrollLine({
      employee: emp({ id: 'e6', baseSalary: 1000, salaryType: 'half_month' }),
      batchType: 'bi_monthly',
      periodFrom: '2026-06-01',
      periodTo: '2026-06-15',
      advanceBalance: 600,
      debtMode: 'carry_forward',
    });
    expect(line.advanceDeducted).toBe(0);
    expect(line.netSalary).toBe(line.grossSalary);
    expect(line.debtCarriedForward).toBeGreaterThan(0);
  });
});

describe('employeeMonthlyEquivalent', () => {
  it('normalizes daily workers to monthly estimate', () => {
    const monthly = employeeMonthlyEquivalent(
      emp({ id: 'd1', baseSalary: 100, salaryType: 'daily', allowances: { housing: 0, transport: 0, food: 0 } }),
    );
    expect(monthly).toBe(3000);
  });
});
