/**
 * منطق الرواتب — أنواع الأجر، احتساب كشوف الصرف، المكافآت، وترحيل الدين.
 */

import { round } from './inventory';
import { accountLabel } from './treasury';
import type {
  AccountSourceType,
  BankAccount,
  CashVault,
  Employee,
  PayrollBatch,
  PayrollDebtMode,
  PayrollLine,
  PayrollType,
  SalaryType,
} from './types';

export const MONTHLY_REFERENCE_DAYS = 30;
export const HALF_MONTH_REFERENCE_DAYS = 15;

export function employeeAllowancesTotal(e: Employee): number {
  return round(e.allowances.housing + e.allowances.transport + e.allowances.food);
}

/** يحوّل نوع راتب الموظف إلى نوع كشف الرواتب المطابق. */
export function payrollTypeForSalaryType(salaryType: SalaryType): PayrollType {
  switch (salaryType) {
    case 'daily':
      return 'daily';
    case 'half_month':
      return 'bi_monthly';
    default:
      return 'monthly';
  }
}

export function salaryTypeMatchesBatch(
  salaryType: SalaryType | undefined,
  batchType: PayrollType,
): boolean {
  return payrollTypeForSalaryType(salaryType ?? 'monthly') === batchType;
}

export function countPeriodDays(periodFrom: string, periodTo: string): number {
  const from = new Date(periodFrom.slice(0, 10));
  const to = new Date(periodTo.slice(0, 10));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 1;
  const diff = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  return Math.max(1, diff);
}

/** تكلفة شهرية تقديرية للموظف (للإحصائيات والمقارنة). */
export function employeeMonthlyEquivalent(e: Employee): number {
  const allowances = employeeAllowancesTotal(e);
  switch (e.salaryType ?? 'monthly') {
    case 'daily':
      return round((e.baseSalary + allowances / MONTHLY_REFERENCE_DAYS) * MONTHLY_REFERENCE_DAYS);
    case 'half_month':
      return round((e.baseSalary + allowances) * 2);
    default:
      return round(e.baseSalary + allowances);
  }
}

export interface PayrollLineInput {
  employee: Employee;
  batchType: PayrollType;
  periodFrom: string;
  periodTo: string;
  advanceBalance: number;
  bonusAmount?: number;
  debtMode?: PayrollDebtMode;
  notes?: string;
}

/** يطبّق حقول قديمة على سطر كشف بدون grossSalary/debtMode. */
export function normalizePayrollLine(raw: PayrollLine): PayrollLine {
  const bonusAmount = raw.bonusAmount ?? 0;
  const advanceDeducted = raw.advanceDeducted ?? 0;
  const grossSalary =
    raw.grossSalary ?? round(raw.netSalary + advanceDeducted - bonusAmount);
  const debtBefore = raw.debtBefore ?? 0;
  const debtMode = raw.debtMode ?? 'deduct';
  const debtCarriedForward =
    raw.debtCarriedForward ??
    (debtMode === 'carry_forward'
      ? Math.min(debtBefore, grossSalary + bonusAmount)
      : Math.max(0, debtBefore - advanceDeducted));

  return {
    ...raw,
    grossSalary,
    bonusAmount,
    debtBefore,
    debtCarriedForward,
    debtMode,
  };
}

function computeGrossSalary(
  employee: Employee,
  batchType: PayrollType,
  periodFrom: string,
  periodTo: string,
): { gross: number; attendanceDays: number; absenceDays: number } {
  const allowancesTotal = employeeAllowancesTotal(employee);
  const periodDays = countPeriodDays(periodFrom, periodTo);
  const absenceDays =
    employee.status === 'on_leave'
      ? Math.min(
          periodDays,
          batchType === 'bi_monthly'
            ? HALF_MONTH_REFERENCE_DAYS
            : batchType === 'daily'
              ? periodDays
              : MONTHLY_REFERENCE_DAYS,
        )
      : 0;

  let attendanceDays: number;
  let gross: number;
  const salaryType = employee.salaryType ?? 'monthly';

  if (salaryType === 'daily' || batchType === 'daily') {
    attendanceDays = Math.max(0, periodDays - absenceDays);
    const dailyAllowance = round(allowancesTotal / MONTHLY_REFERENCE_DAYS);
    gross = round(employee.baseSalary * attendanceDays + dailyAllowance * attendanceDays);
  } else if (salaryType === 'half_month' || batchType === 'bi_monthly') {
    const refDays = Math.min(periodDays, HALF_MONTH_REFERENCE_DAYS);
    attendanceDays = Math.max(0, refDays - absenceDays);
    const halfBase = round(employee.baseSalary * 0.5);
    const halfAllowances = round(allowancesTotal * 0.5);
    const dailyCombined = (halfBase + halfAllowances) / HALF_MONTH_REFERENCE_DAYS;
    gross = round(halfBase + halfAllowances - absenceDays * dailyCombined);
  } else {
    attendanceDays = Math.max(0, MONTHLY_REFERENCE_DAYS - absenceDays);
    const dailyCombined = (employee.baseSalary + allowancesTotal) / MONTHLY_REFERENCE_DAYS;
    gross = round(employee.baseSalary + allowancesTotal - absenceDays * dailyCombined);
  }

  return { gross: Math.max(0, gross), attendanceDays, absenceDays };
}

/** يبني سطر كشف رواتب مع خصم/ترحيل الدين والمكافآت. */
export function buildPayrollLine(input: PayrollLineInput): PayrollLine {
  const {
    employee,
    batchType,
    periodFrom,
    periodTo,
    advanceBalance,
    bonusAmount = 0,
    debtMode = 'deduct',
    notes,
  } = input;
  const allowancesTotal = employeeAllowancesTotal(employee);
  const { gross, attendanceDays, absenceDays } = computeGrossSalary(
    employee,
    batchType,
    periodFrom,
    periodTo,
  );
  const bonus = round(Math.max(0, bonusAmount));
  const debtBefore = round(Math.max(0, advanceBalance));
  const payableBase = round(gross + bonus);
  const maxDeductible = round(Math.min(debtBefore, payableBase));

  let advanceDeducted: number;
  let debtCarriedForward: number;
  let netSalary: number;

  if (debtMode === 'carry_forward') {
    advanceDeducted = 0;
    debtCarriedForward = maxDeductible;
    netSalary = payableBase;
  } else {
    advanceDeducted = maxDeductible;
    debtCarriedForward = round(Math.max(0, debtBefore - advanceDeducted));
    netSalary = round(payableBase - advanceDeducted);
  }

  const deductionsTotal = advanceDeducted;

  return {
    employeeId: employee.id,
    baseSalary: employee.baseSalary,
    allowancesTotal,
    grossSalary: gross,
    bonusAmount: bonus,
    deductionsTotal,
    netSalary,
    attendanceDays,
    absenceDays,
    debtBefore,
    advanceDeducted,
    debtCarriedForward,
    debtMode,
    notes,
  };
}

export function buildPayrollLines(
  employees: Employee[],
  batchType: PayrollType,
  periodFrom: string,
  periodTo: string,
  advanceBalances: Map<string, number>,
): PayrollLine[] {
  return employees
    .filter((e) => e.status === 'active' && salaryTypeMatchesBatch(e.salaryType, batchType))
    .map((employee) =>
      buildPayrollLine({
        employee,
        batchType,
        periodFrom,
        periodTo,
        advanceBalance: advanceBalances.get(employee.id) ?? 0,
      }),
    );
}

export function payrollBatchTotal(lines: PayrollLine[]): number {
  return round(lines.reduce((s, l) => s + normalizePayrollLine(l).netSalary, 0));
}

export function payrollBatchGrossTotal(lines: PayrollLine[]): number {
  return round(
    lines.reduce(
      (s, l) => {
        const n = normalizePayrollLine(l);
        return s + n.grossSalary + n.bonusAmount;
      },
      0,
    ),
  );
}

export function payrollBatchAdvanceDeducted(lines: PayrollLine[]): number {
  return round(lines.reduce((s, l) => s + normalizePayrollLine(l).advanceDeducted, 0));
}

export function payrollBatchBonusTotal(lines: PayrollLine[]): number {
  return round(lines.reduce((s, l) => s + normalizePayrollLine(l).bonusAmount, 0));
}

export function payrollBatchCarriedForward(lines: PayrollLine[]): number {
  return round(
    lines.reduce((s, l) => s + normalizePayrollLine(l).debtCarriedForward, 0),
  );
}

export function payrollBatchDebtBefore(lines: PayrollLine[]): number {
  return round(lines.reduce((s, l) => s + normalizePayrollLine(l).debtBefore, 0));
}

export function payoutAccountValue(type: AccountSourceType, id: string): string {
  return `${type}:${id}`;
}

export function parsePayoutAccountValue(value: string): {
  type: AccountSourceType;
  id: string;
} | null {
  const [type, ...rest] = value.split(':');
  const id = rest.join(':');
  if ((type !== 'vault' && type !== 'bank') || !id) return null;
  return { type, id };
}

export function payoutSourceLabel(
  type: AccountSourceType | undefined,
  id: string | undefined,
  vaults: CashVault[],
  banks: BankAccount[],
): string {
  if (!type || !id) return '—';
  return accountLabel(type, id, vaults, banks);
}

/** يقترح مصدر صرف من إعدادات الموظفين أو أول خزنة نشطة. */
export function resolveSuggestedPayout(
  employees: Employee[],
  vaults: CashVault[],
  banks: BankAccount[],
): { type: AccountSourceType; id: string } | null {
  const configured = employees.filter((e) => e.defaultPayoutType && e.defaultPayoutId);
  if (configured.length) {
    const first = configured[0]!;
    const unanimous = configured.every(
      (e) =>
        e.defaultPayoutType === first.defaultPayoutType &&
        e.defaultPayoutId === first.defaultPayoutId,
    );
    if (unanimous) {
      return { type: first.defaultPayoutType!, id: first.defaultPayoutId! };
    }
  }
  const vault = vaults.find((v) => v.isActive);
  if (vault) return { type: 'vault', id: vault.id };
  const bank = banks.find((b) => b.isActive);
  if (bank) return { type: 'bank', id: bank.id };
  return null;
}

export function batchPlannedPayout(batch: PayrollBatch): {
  type: AccountSourceType;
  id: string;
} | null {
  if (batch.paidFromType && batch.paidFromId) {
    return { type: batch.paidFromType, id: batch.paidFromId };
  }
  return null;
}
