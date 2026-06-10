import { describe, expect, it } from 'vitest';
import {
  buildPayrollLine,
  computeActiveMonthlyLabor,
  computeMonthlyLaborBreakdown,
  employeeMonthlyEquivalent,
  previewSalaryFromForm,
  normalizePayrollLine,
  payrollBatchIsPartial,
  payrollBatchPaidCashTotal,
  payrollBatchPaidCount,
  payrollBatchRemainingSummary,
  payrollBatchTotal,
  payrollBatchTotalAmount,
  payrollBatchUnpaidTotal,
  payrollTypeForSalaryType,
  resolvePayrollLinePreview,
  salaryTypeMatchesBatch,
} from '@/lib/domain/payroll';
import type { Employee, PayrollBatch } from '@/lib/domain/types';

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
    expect(salaryTypeMatchesBatch('monthly', 'bi_monthly')).toBe(true);
    expect(salaryTypeMatchesBatch('half_month', 'bi_monthly')).toBe(true);
    expect(salaryTypeMatchesBatch('daily', 'daily')).toBe(true);
    expect(salaryTypeMatchesBatch('daily', 'monthly')).toBe(false);
    expect(salaryTypeMatchesBatch('half_month', 'monthly')).toBe(false);
    expect(salaryTypeMatchesBatch('monthly', 'all')).toBe(true);
    expect(salaryTypeMatchesBatch('half_month', 'all')).toBe(true);
    expect(salaryTypeMatchesBatch('daily', 'all')).toBe(true);
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

  it('pays half-month amount as entered for half_month employees', () => {
    const line = buildPayrollLine({
      employee: emp({
        id: 'e2',
        baseSalary: 1300,
        allowances: { housing: 150, transport: 150, food: 120 },
        salaryType: 'half_month',
      }),
      batchType: 'bi_monthly',
      periodFrom: '2026-06-01',
      periodTo: '2026-06-15',
      advanceBalance: 0,
    });
    expect(line.grossSalary).toBe(1720);
    expect(line.netSalary).toBe(1720);
  });

  it('all batch: 15 days — monthly half, half_month full, daily × days', () => {
    const all = {
      periodFrom: '2026-06-01',
      periodTo: '2026-06-15',
      batchType: 'all' as const,
      advanceBalance: 0,
    };

    expect(
      buildPayrollLine({
        employee: emp({ id: 'm', baseSalary: 1000, salaryType: 'monthly' }),
        ...all,
      }).grossSalary,
    ).toBe(500);

    expect(
      buildPayrollLine({
        employee: emp({ id: 'h', baseSalary: 1000, salaryType: 'half_month' }),
        ...all,
      }).grossSalary,
    ).toBe(1000);

    expect(
      buildPayrollLine({
        employee: emp({ id: 'd', baseSalary: 100, salaryType: 'daily' }),
        ...all,
      }).grossSalary,
    ).toBe(1500);
  });

  it('pays half of monthly package for monthly employees in bi_monthly batch', () => {
    const line = buildPayrollLine({
      employee: emp({
        id: 'e2b',
        baseSalary: 3000,
        allowances: { housing: 600, transport: 0, food: 0 },
        salaryType: 'monthly',
      }),
      batchType: 'bi_monthly',
      periodFrom: '2026-06-01',
      periodTo: '2026-06-15',
      advanceBalance: 0,
    });
    expect(line.grossSalary).toBe(1800);
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

describe('individual line payment', () => {
  it('tracks paid and unpaid lines', () => {
    const lines = [
      {
        employeeId: 'e1',
        baseSalary: 1000,
        allowancesTotal: 0,
        grossSalary: 1000,
        bonusAmount: 0,
        deductionsTotal: 0,
        netSalary: 1000,
        attendanceDays: 30,
        absenceDays: 0,
        debtBefore: 0,
        advanceDeducted: 0,
        debtCarriedForward: 0,
        debtMode: 'deduct' as const,
        paidAt: '2026-06-10',
      },
      {
        employeeId: 'e2',
        baseSalary: 800,
        allowancesTotal: 0,
        grossSalary: 800,
        bonusAmount: 0,
        deductionsTotal: 0,
        netSalary: 800,
        attendanceDays: 30,
        absenceDays: 0,
        debtBefore: 0,
        advanceDeducted: 0,
        debtCarriedForward: 0,
        debtMode: 'deduct' as const,
      },
    ];
    expect(payrollBatchPaidCount(lines, 'approved')).toBe(1);
    expect(payrollBatchUnpaidTotal(lines, 'approved')).toBe(800);
    expect(payrollBatchIsPartial({ lines, status: 'approved' } as PayrollBatch)).toBe(true);
  });

  it('remaining summary counts only unpaid lines', () => {
    const lines = [
      {
        employeeId: 'e1',
        baseSalary: 1000,
        allowancesTotal: 0,
        grossSalary: 1000,
        bonusAmount: 100,
        deductionsTotal: 200,
        netSalary: 900,
        attendanceDays: 30,
        absenceDays: 0,
        debtBefore: 200,
        advanceDeducted: 200,
        debtCarriedForward: 0,
        debtMode: 'deduct' as const,
        paidAt: '2026-06-10',
      },
      {
        employeeId: 'e2',
        baseSalary: 800,
        allowancesTotal: 0,
        grossSalary: 800,
        bonusAmount: 0,
        deductionsTotal: 0,
        netSalary: 800,
        attendanceDays: 30,
        absenceDays: 0,
        debtBefore: 0,
        advanceDeducted: 0,
        debtCarriedForward: 0,
        debtMode: 'deduct' as const,
      },
    ];
    const summary = payrollBatchRemainingSummary(lines, 'approved');
    expect(summary.unpaidCount).toBe(1);
    expect(summary.grossWithBonus).toBe(800);
    expect(summary.net).toBe(800);
    expect(summary.deducted).toBe(0);
  });

  it('totalAmount is disbursed cash when batch is paid', () => {
    const lines = [
      {
        employeeId: 'e1',
        baseSalary: 1000,
        allowancesTotal: 0,
        grossSalary: 1000,
        bonusAmount: 0,
        deductionsTotal: 0,
        netSalary: 1000,
        attendanceDays: 30,
        absenceDays: 0,
        debtBefore: 0,
        advanceDeducted: 0,
        debtCarriedForward: 0,
        debtMode: 'deduct' as const,
        paidAt: '2026-06-10',
      },
      {
        employeeId: 'e2',
        baseSalary: 500,
        allowancesTotal: 0,
        grossSalary: 500,
        bonusAmount: 0,
        deductionsTotal: 0,
        netSalary: 500,
        attendanceDays: 30,
        absenceDays: 0,
        debtBefore: 0,
        advanceDeducted: 0,
        debtCarriedForward: 0,
        debtMode: 'deduct' as const,
        paidAt: '2026-06-10',
      },
    ];
    expect(payrollBatchTotalAmount(lines, 'paid')).toBe(1500);
    expect(payrollBatchTotalAmount(lines, 'approved')).toBe(0);
  });
});

describe('previewSalaryFromForm', () => {
  it('half_month: stored amount is paid in full in bi_monthly batch', () => {
    const p = previewSalaryFromForm({
      salaryType: 'half_month',
      baseSalary: 800,
      allowances: { housing: 100, transport: 56, food: 0 },
    });
    expect(p.storedTotal).toBe(956);
    expect(p.batchLines[0].amount).toBe(956);
    expect(p.monthlyCost).toBe(1912);
  });

  it('monthly: full in monthly batch, half in bi_monthly', () => {
    const p = previewSalaryFromForm({
      salaryType: 'monthly',
      baseSalary: 3000,
      allowances: { housing: 600, transport: 0, food: 0 },
    });
    expect(p.storedTotal).toBe(3600);
    expect(p.batchLines[0].amount).toBe(3600);
    expect(p.batchLines[1].amount).toBe(1800);
  });

  it('daily: shows day rate and period example', () => {
    const p = previewSalaryFromForm({
      salaryType: 'daily',
      baseSalary: 85,
      allowances: { housing: 0, transport: 50, food: 30 },
    });
    expect(p.storedTotal).toBe(88);
    expect(p.batchLines[1].amount).toBe(88 * 15);
  });
});

describe('employeeMonthlyEquivalent', () => {
  it('normalizes daily workers to monthly estimate', () => {
    const monthly = employeeMonthlyEquivalent(
      emp({ id: 'd1', baseSalary: 100, salaryType: 'daily', allowances: { housing: 0, transport: 0, food: 0 } }),
    );
    expect(monthly).toBe(3000);
  });

  it('doubles half-month pay for monthly labor cost', () => {
    const monthly = employeeMonthlyEquivalent(
      emp({
        id: 'h1',
        baseSalary: 1300,
        salaryType: 'half_month',
        allowances: { housing: 150, transport: 150, food: 120 },
      }),
    );
    expect(monthly).toBe(3440);
  });

  it('monthly employee uses base + allowances as-is', () => {
    expect(
      employeeMonthlyEquivalent(
        emp({
          id: 'm1',
          baseSalary: 2200,
          salaryType: 'monthly',
          allowances: { housing: 300, transport: 250, food: 150 },
        }),
      ),
    ).toBe(2900);
  });
});

describe('computeMonthlyLaborBreakdown', () => {
  it('separates monthly cost from half-month per-pay amount', () => {
    const roster = [
      emp({
        id: 'm1',
        baseSalary: 3000,
        salaryType: 'monthly',
        allowances: { housing: 600, transport: 0, food: 0 },
      }),
      emp({
        id: 'h1',
        baseSalary: 1900,
        salaryType: 'half_month',
        allowances: { housing: 0, transport: 0, food: 0 },
      }),
      emp({
        id: 'h2',
        baseSalary: 1900,
        salaryType: 'half_month',
        allowances: { housing: 0, transport: 0, food: 0 },
      }),
    ];
    const b = computeMonthlyLaborBreakdown(roster);
    expect(b.monthly).toBe(3600);
    expect(b.halfMonthMonthly).toBe(7600);
    expect(b.halfMonthPerPay).toBe(3800);
    expect(b.total).toBe(11200);
    expect(computeActiveMonthlyLabor(roster)).toBe(11200);
  });

  it('all half_month: total = halfMonthPerPay × 2', () => {
    const roster = [
      emp({ id: 'h1', baseSalary: 1900, salaryType: 'half_month' }),
      emp({ id: 'h2', baseSalary: 1900, salaryType: 'half_month' }),
    ];
    const b = computeMonthlyLaborBreakdown(roster);
    expect(b.allHalfMonth).toBe(true);
    expect(b.halfMonthPerPay).toBe(3800);
    expect(b.total).toBe(7600);
    expect(b.total).toBe(b.halfMonthPerPay * 2);
  });
});

describe('computeActiveMonthlyLabor', () => {
  it('matches seed active roster (5 نشطين، بدون إجازة)', () => {
    const roster = [
      emp({
        id: 'emp-1',
        baseSalary: 2200,
        salaryType: 'monthly',
        allowances: { housing: 300, transport: 250, food: 150 },
      }),
      emp({
        id: 'emp-2',
        baseSalary: 85,
        salaryType: 'daily',
        allowances: { housing: 0, transport: 50, food: 30 },
      }),
      emp({
        id: 'emp-3',
        baseSalary: 2400,
        salaryType: 'monthly',
        allowances: { housing: 350, transport: 200, food: 150 },
      }),
      emp({
        id: 'emp-4',
        baseSalary: 1300,
        salaryType: 'half_month',
        allowances: { housing: 150, transport: 150, food: 120 },
      }),
      emp({
        id: 'emp-5',
        baseSalary: 80,
        salaryType: 'daily',
        allowances: { housing: 0, transport: 40, food: 25 },
      }),
      emp({
        id: 'emp-6',
        baseSalary: 1800,
        salaryType: 'half_month',
        status: 'on_leave',
        allowances: { housing: 250, transport: 150, food: 120 },
      }),
    ];
    // 2900 + 2640 + 3100 + 3440 + 2460 = 14540 (emp-6 مستبعد)
    expect(computeActiveMonthlyLabor(roster)).toBe(14540);
  });
});

describe('resolvePayrollLinePreview', () => {
  it('returns stored line when draft unchanged (matches batch card)', () => {
    const employee = emp({
      id: 'e1',
      baseSalary: 1300,
      salaryType: 'half_month',
      allowances: { housing: 150, transport: 150, food: 120 },
    });
    const stored = buildPayrollLine({
      employee,
      batchType: 'bi_monthly',
      periodFrom: '2026-06-01',
      periodTo: '2026-06-15',
      advanceBalance: 200,
      bonusAmount: 0,
      debtMode: 'deduct',
    });
    const batch = {
      payrollType: 'bi_monthly' as const,
      periodFrom: '2026-06-01',
      periodTo: '2026-06-15',
      status: 'draft' as const,
    };
    const preview = resolvePayrollLinePreview(
      stored,
      batch,
      employee,
      { bonusAmount: 0, debtMode: 'deduct' },
      999,
    );
    expect(preview.netSalary).toBe(stored.netSalary);
    expect(preview.debtBefore).toBe(stored.debtBefore);
    expect(payrollBatchTotal([stored], 'draft')).toBe(payrollBatchTotal([preview], 'draft'));
  });
});

describe('payroll remaining reconciliation', () => {
  it('net equals manual sum of unpaid line netSalary', () => {
    const paid = buildPayrollLine({
      employee: emp({ id: 'p1', baseSalary: 2000, salaryType: 'monthly' }),
      batchType: 'monthly',
      periodFrom: '2026-06-01',
      periodTo: '2026-06-30',
      advanceBalance: 0,
    });
    const unpaid = buildPayrollLine({
      employee: emp({
        id: 'p2',
        baseSalary: 1500,
        salaryType: 'monthly',
        allowances: { housing: 100, transport: 0, food: 0 },
      }),
      batchType: 'monthly',
      periodFrom: '2026-06-01',
      periodTo: '2026-06-30',
      advanceBalance: 300,
      bonusAmount: 50,
      debtMode: 'deduct',
    });
    const lines = [
      { ...paid, paidAt: '2026-06-05' },
      unpaid,
    ];
    const manual = lines
      .filter((l) => !l.paidAt)
      .reduce((s, l) => s + normalizePayrollLine(l).netSalary, 0);
    expect(payrollBatchTotal(lines, 'approved')).toBe(manual);
    expect(payrollBatchUnpaidTotal(lines, 'approved')).toBe(unpaid.netSalary);
  });

  it('user scenario: gross 4300 - debt 500 = net 3800 from treasury', () => {
    const line = buildPayrollLine({
      employee: emp({
        id: 'u0',
        baseSalary: 4300,
        salaryType: 'half_month',
      }),
      batchType: 'bi_monthly',
      periodFrom: '2026-06-01',
      periodTo: '2026-06-15',
      advanceBalance: 500,
      debtMode: 'deduct',
    });
    const summary = payrollBatchRemainingSummary([line], 'draft');
    expect(line.grossSalary).toBe(4300);
    expect(summary.grossWithBonus).toBe(4300);
    expect(summary.deducted).toBe(500);
    expect(summary.net).toBe(3800);
    expect(summary.net).toBe(summary.grossWithBonus - summary.deducted);
  });

  it('remaining summary: net = grossWithBonus - deducted (خصم)', () => {
    const line = buildPayrollLine({
      employee: emp({ id: 'u1', baseSalary: 1200, salaryType: 'monthly' }),
      batchType: 'monthly',
      periodFrom: '2026-06-01',
      periodTo: '2026-06-30',
      advanceBalance: 250,
      bonusAmount: 80,
      debtMode: 'deduct',
    });
    const summary = payrollBatchRemainingSummary([line], 'draft');
    expect(summary.unpaidCount).toBe(1);
    expect(summary.grossWithBonus).toBe(line.grossSalary + line.bonusAmount);
    expect(summary.deducted).toBe(line.advanceDeducted);
    expect(summary.net).toBe(line.netSalary);
    expect(summary.net).toBe(summary.grossWithBonus - summary.deducted);
  });

  it('remaining summary: net = grossWithBonus when debt carried forward', () => {
    const line = buildPayrollLine({
      employee: emp({ id: 'u2', baseSalary: 1000, salaryType: 'half_month' }),
      batchType: 'bi_monthly',
      periodFrom: '2026-06-01',
      periodTo: '2026-06-15',
      advanceBalance: 400,
      debtMode: 'carry_forward',
    });
    const summary = payrollBatchRemainingSummary([line], 'draft');
    expect(summary.net).toBe(line.netSalary);
    expect(summary.deducted).toBe(0);
    expect(summary.carried).toBe(line.debtCarriedForward);
    expect(summary.net).toBe(summary.grossWithBonus);
  });

  it('partial batch: paidCash + remaining = full batch cash if all paid', () => {
    const a = buildPayrollLine({
      employee: emp({ id: 'a', baseSalary: 1000, salaryType: 'monthly' }),
      batchType: 'monthly',
      periodFrom: '2026-06-01',
      periodTo: '2026-06-30',
      advanceBalance: 0,
    });
    const b = buildPayrollLine({
      employee: emp({ id: 'b', baseSalary: 800, salaryType: 'monthly' }),
      batchType: 'monthly',
      periodFrom: '2026-06-01',
      periodTo: '2026-06-30',
      advanceBalance: 100,
      debtMode: 'deduct',
    });
    const lines = [{ ...a, paidAt: '2026-06-01' }, b];
    const paidCash = payrollBatchPaidCashTotal(lines, 'approved');
    const remaining = payrollBatchTotal(lines, 'approved');
    expect(paidCash + remaining).toBe(a.netSalary + b.netSalary);
    expect(paidCash).toBe(a.netSalary);
    expect(remaining).toBe(b.netSalary);
  });
});
