/**
 * محرك الخزن والبنوك (v3.0).
 * الرصيد = الرصيد الافتتاحي + Σ الحركات الواردة − Σ الحركات الصادرة.
 */

import { round } from './inventory';
import type {
  AccountSourceType,
  BankAccount,
  CashMovement,
  CashVault,
  Expense,
  ExpenseCategory,
  PayrollBatch,
} from './types';

export interface AccountBalance {
  id: string;
  type: AccountSourceType;
  name: string;
  code: string;
  opening: number;
  inflow: number;
  outflow: number;
  balance: number;
  isActive: boolean;
  minThreshold?: number;
  belowMin: boolean;
}

function flows(id: string, movements: CashMovement[]) {
  let inflow = 0;
  let outflow = 0;
  for (const m of movements) {
    if (m.sourceId !== id) continue;
    if (m.direction === 'in') inflow += m.amount;
    else outflow += m.amount;
  }
  return { inflow: round(inflow), outflow: round(outflow) };
}

export interface TreasurySnapshot {
  accounts: AccountBalance[];
  vaults: AccountBalance[];
  banks: AccountBalance[];
  totalVaults: number;
  totalBanks: number;
  total: number;
}

export function computeTreasury(
  vaults: CashVault[],
  banks: BankAccount[],
  movements: CashMovement[],
): TreasurySnapshot {
  const vaultBalances: AccountBalance[] = vaults.map((v) => {
    const f = flows(v.id, movements);
    const balance = round(v.openingBalance + f.inflow - f.outflow);
    return {
      id: v.id,
      type: 'vault',
      name: v.name,
      code: v.code,
      opening: v.openingBalance,
      inflow: f.inflow,
      outflow: f.outflow,
      balance,
      isActive: v.isActive,
      minThreshold: v.minThreshold,
      belowMin: v.minThreshold !== undefined && balance < v.minThreshold,
    };
  });

  const bankBalances: AccountBalance[] = banks.map((b) => {
    const f = flows(b.id, movements);
    const balance = round(b.openingBalance + f.inflow - f.outflow);
    return {
      id: b.id,
      type: 'bank',
      name: b.bankName,
      code: b.code,
      opening: b.openingBalance,
      inflow: f.inflow,
      outflow: f.outflow,
      balance,
      isActive: b.isActive,
      belowMin: false,
    };
  });

  const totalVaults = round(vaultBalances.reduce((s, x) => s + x.balance, 0));
  const totalBanks = round(bankBalances.reduce((s, x) => s + x.balance, 0));

  return {
    accounts: [...vaultBalances, ...bankBalances],
    vaults: vaultBalances,
    banks: bankBalances,
    totalVaults,
    totalBanks,
    total: round(totalVaults + totalBanks),
  };
}

export interface AdjustedNetPositionStep {
  label: string;
  detail?: string;
  amount: number;
  /** + إضافة، − خصم، = أساس */
  op: 'base' | 'add' | 'subtract';
  runningTotal: number;
}

/** الرصيد النهائي بعد تسوية الديون والمخزون — حساب متسلسل. */
export interface AdjustedNetPosition {
  cash: number;
  receivables: number;
  inventoryValue: number;
  payables: number;
  finalBalance: number;
  steps: AdjustedNetPositionStep[];
}

export function computeAdjustedNetPosition(input: {
  cash: number;
  receivables: number;
  inventoryValue: number;
  payables: number;
}): AdjustedNetPosition {
  const cash = round(input.cash);
  const receivables = round(input.receivables);
  const inventoryValue = round(input.inventoryValue);
  const payables = round(input.payables);

  let running = cash;
  const steps: AdjustedNetPositionStep[] = [
    {
      label: 'صافي المركز النقدي',
      detail: 'مجموع أرصدة الخزائن والحسابات البنكية',
      amount: cash,
      op: 'base',
      runningTotal: running,
    },
  ];

  running = round(running + receivables);
  steps.push({
    label: 'الديون المستحقة لنا',
    detail: 'فلاحون، عملاء، موظفون، وأطراف خارجيون',
    amount: receivables,
    op: 'add',
    runningTotal: running,
  });

  running = round(running + inventoryValue);
  steps.push({
    label: 'قيمة مخزون الحليب التقديرية',
    detail: 'بمتوسط التكلفة المرجّح المتحرّك',
    amount: inventoryValue,
    op: 'add',
    runningTotal: running,
  });

  running = round(running - payables);
  steps.push({
    label: 'الديون المستحقة علينا',
    detail: 'التزامات مستحقة للفلاحين والغير',
    amount: payables,
    op: 'subtract',
    runningTotal: running,
  });

  return {
    cash,
    receivables,
    inventoryValue,
    payables,
    finalBalance: running,
    steps,
  };
}

export function accountBalance(
  type: AccountSourceType,
  id: string,
  vaults: CashVault[],
  banks: BankAccount[],
  movements: CashMovement[],
): number {
  const opening =
    type === 'vault'
      ? vaults.find((v) => v.id === id)?.openingBalance ?? 0
      : banks.find((b) => b.id === id)?.openingBalance ?? 0;
  const f = flows(id, movements);
  return round(opening + f.inflow - f.outflow);
}

export function accountLabel(
  type: AccountSourceType,
  id: string,
  vaults: CashVault[],
  banks: BankAccount[],
): string {
  if (type === 'vault') return vaults.find((v) => v.id === id)?.name ?? 'خزنة';
  return banks.find((b) => b.id === id)?.bankName ?? 'بنك';
}

// ============================================================
// المصاريف
// ============================================================

export interface ExpenseTotals {
  total: number;
  byCategory: { categoryId: string; name: string; group: string; amount: number; budget?: number }[];
}

export function computeExpenseTotals(
  expenses: Expense[],
  categories: ExpenseCategory[],
): ExpenseTotals {
  const map = new Map<string, number>();
  for (const e of expenses) {
    if (e.status === 'rejected') continue;
    map.set(e.categoryId, (map.get(e.categoryId) ?? 0) + e.amount);
  }
  const byCategory = categories
    .map((c) => ({
      categoryId: c.id,
      name: c.name,
      group: c.group,
      amount: round(map.get(c.id) ?? 0),
      budget: c.budgetMonthly,
    }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  return { total: round([...map.values()].reduce((s, x) => s + x, 0)), byCategory };
}

// ============================================================
// الرواتب
// ============================================================

export function payrollTotal(batch: PayrollBatch): number {
  return round(batch.lines.reduce((s, l) => s + l.netSalary, 0));
}

export function computeNetSalary(line: {
  baseSalary: number;
  allowancesTotal: number;
  deductionsTotal: number;
}): number {
  return round(line.baseSalary + line.allowancesTotal - line.deductionsTotal);
}
