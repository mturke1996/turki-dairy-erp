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
  const t = salaryType ?? 'monthly';
  switch (batchType) {
    case 'all':
      return true;
    case 'daily':
      return t === 'daily';
    case 'bi_monthly':
      return t === 'half_month' || t === 'monthly';
    case 'monthly':
      return t === 'monthly';
    default:
      return false;
  }
}

function payReferenceDays(
  salaryType: SalaryType,
  batchType: PayrollType,
  periodDays: number,
): number {
  if (salaryType === 'daily' || batchType === 'daily') return periodDays;
  if (batchType === 'all') {
    if (salaryType === 'half_month') return HALF_MONTH_REFERENCE_DAYS;
    return MONTHLY_REFERENCE_DAYS;
  }
  if (batchType === 'bi_monthly') return HALF_MONTH_REFERENCE_DAYS;
  if (salaryType === 'half_month') return MONTHLY_REFERENCE_DAYS;
  return MONTHLY_REFERENCE_DAYS;
}

export function countPeriodDays(periodFrom: string, periodTo: string): number {
  const from = new Date(periodFrom.slice(0, 10));
  const to = new Date(periodTo.slice(0, 10));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 1;
  const diff = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  return Math.max(1, diff);
}

/** أساسي + بدلات كما أُدخلت (شهري / نصف شهر / أجر يومي + بدلات شهرية). */
export function employeeMonthlyPackage(e: Employee): number {
  return Math.round(e.baseSalary + employeeAllowancesTotal(e));
}

/** أجر نصف الشهر المُدخل لموظف نوعه «نصف شهر». */
export function employeeHalfMonthPay(e: Employee): number {
  return employeeMonthlyPackage(e);
}

/** الأجر اليومي (أساسي + بدلات/30). */
export function employeeDailyRate(e: Employee): number {
  const dailyAllowance = Math.round(employeeAllowancesTotal(e) / MONTHLY_REFERENCE_DAYS);
  return Math.round(e.baseSalary + dailyAllowance);
}

/**
 * أجر فترة كشف نصف شهري:
 * - نصف شهر: المبلغ المُدخل كما هو
 * - شهري: نصف الراتب الشهري
 */
export function employeeBiMonthlyPay(e: Employee): number {
  const pkg = employeeMonthlyPackage(e);
  switch (e.salaryType ?? 'monthly') {
    case 'half_month':
      return pkg;
    case 'monthly':
      return Math.round(pkg / 2);
    default:
      return 0;
  }
}

/** الأجر المعروض في قائمة الموظفين. */
export function employeePeriodPackage(e: Employee): number {
  switch (e.salaryType ?? 'monthly') {
    case 'half_month':
      return employeeHalfMonthPay(e);
    case 'daily':
      return employeeDailyRate(e);
    default:
      return employeeMonthlyPackage(e);
  }
}

export type SalaryFormPreviewLine = { label: string; amount: number };

export type SalaryFormPreview = {
  storedLabel: string;
  storedTotal: number;
  batchLines: SalaryFormPreviewLine[];
  monthlyCost: number;
  allowanceSectionLabel: string;
};

/** معاينة نموذج الموظف — تطابق منطق كشف الرواتب. */
export function previewSalaryFromForm(
  input: Pick<Employee, 'salaryType' | 'baseSalary' | 'allowances'>,
): SalaryFormPreview {
  const e = input as Employee;
  switch (input.salaryType ?? 'monthly') {
    case 'half_month': {
      const half = employeeHalfMonthPay(e);
      return {
        storedLabel: 'مجموع أجر نصف الشهر',
        storedTotal: half,
        batchLines: [
          { label: 'كشف نصف شهر / «الكل» 15 يوم — يُصرف كاملاً', amount: half },
        ],
        monthlyCost: half * 2,
        allowanceSectionLabel: 'البدلات (نصف شهر)',
      };
    }
    case 'daily': {
      const dayRate = employeeDailyRate(e);
      return {
        storedLabel: 'الأجر اليومي (مع البدلات)',
        storedTotal: dayRate,
        batchLines: [
          { label: 'كشف يومي / «الكل» — أجر × أيام الفترة', amount: dayRate },
          { label: 'مثال: 15 يوم', amount: dayRate * 15 },
        ],
        monthlyCost: employeeMonthlyEquivalent(e),
        allowanceSectionLabel: 'البدلات الشهرية (تُقسَّم على 30 يوم)',
      };
    }
    default: {
      const monthly = employeeMonthlyPackage(e);
      return {
        storedLabel: 'مجموع الراتب الشهري',
        storedTotal: monthly,
        batchLines: [
          { label: 'كشف شهري — يُصرف كاملاً', amount: monthly },
          { label: 'كشف نصف شهر / «الكل» 15 يوم — النصف', amount: employeeBiMonthlyPay(e) },
        ],
        monthlyCost: monthly,
        allowanceSectionLabel: 'البدلات الشهرية',
      };
    }
  }
}

export type MonthlyLaborBreakdown = {
  monthly: number;
  halfMonthMonthly: number;
  daily: number;
  /** مجموع أجر نصف الشهر لكل نشط — يُصرف في كشف واحد */
  halfMonthPerPay: number;
  total: number;
  activeCount: number;
  /** الكل نشطون بنوع نصف شهر */
  allHalfMonth: boolean;
};

export function computeMonthlyLaborBreakdown(employees: Employee[]): MonthlyLaborBreakdown {
  const active = employees.filter((e) => e.status === 'active');
  let monthly = 0;
  let halfMonthMonthly = 0;
  let daily = 0;
  let halfMonthPerPay = 0;
  for (const e of active) {
    switch (e.salaryType ?? 'monthly') {
      case 'half_month': {
        const half = employeeHalfMonthPay(e);
        halfMonthPerPay += half;
        halfMonthMonthly += half * 2;
        break;
      }
      case 'daily':
        daily += Math.round(employeeMonthlyEquivalent(e));
        break;
      default:
        monthly += employeePeriodPackage(e);
    }
  }
  const allHalfMonth = active.length > 0 && monthly === 0 && daily === 0 && halfMonthPerPay > 0;
  return {
    monthly,
    halfMonthMonthly,
    daily,
    halfMonthPerPay,
    total: allHalfMonth ? halfMonthPerPay * 2 : monthly + halfMonthMonthly + daily,
    activeCount: active.length,
    allHalfMonth,
  };
}

/** كلفة شهرية للنشطين — نصف شهر: مجموع أجور نصف الشهر × 2 */
export function computeActiveMonthlyLabor(employees: Employee[]): number {
  return computeMonthlyLaborBreakdown(employees).total;
}

/** معاينة سطر كشف — تُبقي المخزّن إن لم يتغيّر المسودة (يتطابق مع بطاقة القائمة). */
export function resolvePayrollLinePreview(
  stored: PayrollLine,
  batch: Pick<PayrollBatch, 'payrollType' | 'periodFrom' | 'periodTo' | 'status'>,
  employee: Employee,
  draft: { bonusAmount: number; debtMode: PayrollDebtMode; notes?: string },
  advanceBalance: number,
): PayrollLine {
  const storedNorm = normalizePayrollLine(stored);
  if (isPayrollLinePaid(storedNorm, batch.status)) return storedNorm;

  const draftMatches =
    draft.bonusAmount === storedNorm.bonusAmount &&
    draft.debtMode === storedNorm.debtMode &&
    (draft.notes ?? '') === (storedNorm.notes ?? '');

  if (draftMatches) return storedNorm;

  return buildPayrollLine({
    employee,
    batchType: batch.payrollType,
    periodFrom: batch.periodFrom,
    periodTo: batch.periodTo,
    advanceBalance,
    bonusAmount: draft.bonusAmount,
    debtMode: draft.debtMode,
    notes: draft.notes || undefined,
  });
}

/** تكلفة شهرية للموظف — نصف شهر: أجر نصف الشهر × 2 */
export function employeeMonthlyEquivalent(e: Employee): number {
  switch (e.salaryType ?? 'monthly') {
    case 'half_month':
      return employeeHalfMonthPay(e) * 2;
    case 'daily': {
      const allowances = employeeAllowancesTotal(e);
      const dailyAllowance = Math.round(allowances / MONTHLY_REFERENCE_DAYS);
      return Math.round(e.baseSalary + dailyAllowance) * MONTHLY_REFERENCE_DAYS;
    }
    default:
      return employeePeriodPackage(e);
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
  const salaryType = employee.salaryType ?? 'monthly';
  const refDays = payReferenceDays(salaryType, batchType, periodDays);
  const absenceDays =
    employee.status === 'on_leave' ? Math.min(periodDays, refDays) : 0;

  let attendanceDays: number;
  let gross: number;

  if (salaryType === 'daily' || batchType === 'daily') {
    attendanceDays = Math.max(0, periodDays - absenceDays);
    const dailyAllowance = round(allowancesTotal / MONTHLY_REFERENCE_DAYS);
    gross = round(employee.baseSalary * attendanceDays + dailyAllowance * attendanceDays);
  } else if (batchType === 'all') {
    attendanceDays = Math.max(0, periodDays - absenceDays);
    let periodPay: number;
    switch (salaryType) {
      case 'half_month':
        periodPay = Math.round(
          employeeHalfMonthPay(employee) * (periodDays / HALF_MONTH_REFERENCE_DAYS),
        );
        break;
      default:
        periodPay = Math.round(
          employeeMonthlyPackage(employee) * (periodDays / MONTHLY_REFERENCE_DAYS),
        );
    }
    const dailyCombined = periodPay / Math.max(1, periodDays);
    gross = Math.round(periodPay - absenceDays * dailyCombined);
  } else if (batchType === 'bi_monthly') {
    const refDays = Math.min(periodDays, HALF_MONTH_REFERENCE_DAYS);
    attendanceDays = Math.max(0, refDays - absenceDays);
    const periodPay = employeeBiMonthlyPay(employee);
    const dailyCombined = periodPay / HALF_MONTH_REFERENCE_DAYS;
    gross = Math.round(periodPay - absenceDays * dailyCombined);
  } else if (salaryType === 'half_month') {
    attendanceDays = Math.max(0, MONTHLY_REFERENCE_DAYS - absenceDays);
    const monthlyPay = employeeHalfMonthPay(employee) * 2;
    const dailyCombined = monthlyPay / MONTHLY_REFERENCE_DAYS;
    gross = Math.round(monthlyPay - absenceDays * dailyCombined);
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

/** هل سُلّم راتب هذا السطر؟ */
export function isPayrollLinePaid(
  line: PayrollLine,
  batchStatus?: PayrollBatch['status'],
): boolean {
  if (batchStatus === 'paid') return true;
  return !!normalizePayrollLine(line).paidAt;
}

export function payrollBatchPaidCount(
  lines: PayrollLine[],
  batchStatus?: PayrollBatch['status'],
): number {
  return lines.filter((l) => isPayrollLinePaid(l, batchStatus)).length;
}

export function allPayrollLinesPaid(
  lines: PayrollLine[],
  batchStatus?: PayrollBatch['status'],
): boolean {
  return lines.length > 0 && lines.every((l) => isPayrollLinePaid(l, batchStatus));
}

export function payrollBatchIsPartial(batch: PayrollBatch): boolean {
  const paid = payrollBatchPaidCount(batch.lines, batch.status);
  return paid > 0 && paid < batch.lines.length && batch.status !== 'paid';
}

/** صافي المتبقي للصرف من الخزينة */
export function payrollBatchUnpaidTotal(
  lines: PayrollLine[],
  batchStatus?: PayrollBatch['status'],
): number {
  return round(
    lines
      .filter((l) => !isPayrollLinePaid(l, batchStatus))
      .reduce((s, l) => s + normalizePayrollLine(l).netSalary, 0),
  );
}

export function payrollBatchTotal(
  lines: PayrollLine[],
  batchStatus?: PayrollBatch['status'],
): number {
  return payrollBatchUnpaidTotal(lines, batchStatus);
}

/** إجمالي الأجور + المكافآت للسطور المحددة */
export function payrollBatchGrossWithBonusTotal(lines: PayrollLine[]): number {
  return payrollBatchGrossTotal(lines) + payrollBatchBonusTotal(lines);
}

/**
 * قيمة totalAmount المخزّنة للكشف:
 * - مسودة / قيد الصرف → المتبقي للصرف
 * - مصروف بالكامل → إجمالي ما خرج من الخزينة
 */
export function payrollBatchTotalAmount(
  lines: PayrollLine[],
  batchStatus: PayrollBatch['status'],
): number {
  if (batchStatus === 'paid') {
    return payrollBatchPaidCashTotal(lines, 'paid');
  }
  return payrollBatchUnpaidTotal(lines, batchStatus);
}

/** ملخص المتبقي للصرف (سطور غير مُصروفة فقط) */
export function payrollBatchRemainingSummary(
  lines: PayrollLine[],
  batchStatus?: PayrollBatch['status'],
): {
  grossWithBonus: number;
  bonus: number;
  deducted: number;
  carried: number;
  net: number;
  unpaidCount: number;
} {
  const unpaid = lines.filter((l) => !isPayrollLinePaid(l, batchStatus));
  return {
    grossWithBonus: payrollBatchGrossWithBonusTotal(unpaid),
    bonus: payrollBatchBonusTotal(unpaid),
    deducted: payrollBatchAdvanceDeducted(unpaid),
    carried: payrollBatchCarriedForward(unpaid),
    net: payrollBatchUnpaidTotal(lines, batchStatus),
    unpaidCount: unpaid.length,
  };
}

/** مجموع ما صُرف فعلياً من الخزينة */
export function payrollBatchPaidCashTotal(
  lines: PayrollLine[],
  batchStatus?: PayrollBatch['status'],
): number {
  return round(
    lines
      .filter((l) => isPayrollLinePaid(l, batchStatus))
      .reduce((s, l) => s + normalizePayrollLine(l).netSalary, 0),
  );
}

export function payrollBatchProgress(batch: PayrollBatch): {
  paid: number;
  total: number;
  percent: number;
} {
  const total = batch.lines.length;
  const paid = payrollBatchPaidCount(batch.lines, batch.status);
  return {
    paid,
    total,
    percent: total ? Math.round((paid / total) * 100) : 0,
  };
}

/** سطور مُصروفة للقيد المحاسبي */
export function payrollBatchSettledLines(batch: PayrollBatch): PayrollLine[] {
  return batch.lines
    .filter((l) => isPayrollLinePaid(l, batch.status))
    .map(normalizePayrollLine);
}

/** مجموع grossSalary فقط (بدون المكافآت) */
export function payrollBatchGrossTotal(lines: PayrollLine[]): number {
  return round(
    lines.reduce((s, l) => s + normalizePayrollLine(l).grossSalary, 0),
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

