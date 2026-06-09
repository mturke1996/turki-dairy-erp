/**
 * المحرّك المحاسبي — القيد المزدوج (Double-Entry).
 *
 * كل عملية تُنشئ قيوداً متوازنة (مجموع المدين = مجموع الدائن):
 *
 *   شراء من فلاح:   مدين المخزون / دائن مستحقات الفلاح
 *   بيع لعميل:      مدين ذمم العملاء / دائن الإيرادات
 *                   + مدين تكلفة البضاعة المباعة / دائن المخزون
 *   دفعة لفلاح:     مدين مستحقات الفلاحين / دائن النقدية
 *   تحصيل من عميل:  مدين النقدية / دائن ذمم العملاء
 */

import type {
  AccountKey,
  CashMovement,
  DebtEntry,
  Expense,
  ExternalIncome,
  InventoryAdjustment,
  JournalEntry,
  JournalLine,
  Payment,
  PayrollBatch,
  SaleTransaction,
  SupplyTransaction,
} from './types';
import { debtRemainingAmount, resolveDebtDirection } from './debt';
import { round } from './inventory';

function line(account: AccountKey, debit: number, credit: number): JournalLine {
  return { account, debit: round(debit), credit: round(credit) };
}

export function journalForSupply(s: SupplyTransaction): JournalEntry {
  return {
    id: `JE-${s.id}`,
    ref: s.ref,
    date: s.date,
    sessionId: s.sessionId,
    kind: 'supply',
    sourceId: s.id,
    description: 'استلام حليب خام من فلاح',
    lines: [line('inventory', s.total, 0), line('farmer_payable', 0, s.total)],
  };
}

export function journalForSale(s: SaleTransaction, cogs: number): JournalEntry {
  const lines: JournalLine[] = [
    line('customer_receivable', s.total, 0),
    line('revenue', 0, s.total),
  ];
  if (cogs > 0) {
    lines.push(line('cogs', cogs, 0), line('inventory', 0, cogs));
  }
  return {
    id: `JE-${s.id}`,
    ref: s.ref,
    date: s.date,
    sessionId: s.sessionId,
    kind: 'sale',
    sourceId: s.id,
    description: 'بيع حليب بالجملة لعميل',
    lines,
  };
}

/** يُنشئ قيداً فقط عند وجود ربط خزينة — لضمان توازن المدين والدائن مع حركة النقد. */
export function journalForPayment(p: Payment): JournalEntry | null {
  if (!p.paidFromType || !p.paidFromId) return null;
  if (p.kind === 'farmer_payment') {
    return {
      id: `JE-${p.id}`,
      ref: p.ref,
      date: p.date,
      sessionId: p.sessionId,
      kind: 'farmer_payment',
      sourceId: p.id,
      description: 'دفع مستحقات لفلاح',
      lines: [line('farmer_payable', p.amount, 0), line('cash', 0, p.amount)],
    };
  }
  if (p.kind === 'employee_advance') {
    return {
      id: `JE-${p.id}`,
      ref: p.ref,
      date: p.date,
      sessionId: p.sessionId,
      kind: 'employee_advance',
      sourceId: p.id,
      description: 'سلفة موظف',
      lines: [line('other_receivable', p.amount, 0), line('cash', 0, p.amount)],
    };
  }
  return {
    id: `JE-${p.id}`,
    ref: p.ref,
    date: p.date,
    sessionId: p.sessionId,
    kind: 'customer_payment',
    sourceId: p.id,
    description: 'تحصيل دفعة من عميل',
    lines: [line('cash', p.amount, 0), line('customer_receivable', 0, p.amount)],
  };
}

export function journalForExpense(e: Expense): JournalEntry {
  return {
    id: `JE-${e.id}`,
    ref: e.ref,
    date: e.date,
    sessionId: e.sessionId,
    kind: 'expense',
    sourceId: e.id,
    description: e.description,
    lines: [line('operating_expense', e.amount, 0), line('cash', 0, e.amount)],
  };
}

export function journalForPayroll(batch: PayrollBatch): JournalEntry {
  return {
    id: `JE-${batch.id}`,
    ref: batch.ref,
    date: batch.paidAt ?? batch.createdAt,
    sessionId: batch.sessionId,
    kind: 'payroll',
    sourceId: batch.id,
    description: batch.label,
    lines: [line('payroll_expense', batch.totalAmount, 0), line('cash', 0, batch.totalAmount)],
  };
}

export function journalForAdjustment(a: InventoryAdjustment): JournalEntry {
  const absQty = Math.abs(a.quantity);
  const value = round(absQty * a.unitCost);
  if (a.quantity > 0) {
    return {
      id: `JE-${a.id}`,
      ref: a.ref,
      date: a.date,
      sessionId: a.sessionId,
      kind: 'adjustment',
      sourceId: a.id,
      description: a.reason,
      lines: [line('inventory', value, 0), line('operating_expense', 0, value)],
    };
  }
  return {
    id: `JE-${a.id}`,
    ref: a.ref,
    date: a.date,
    sessionId: a.sessionId,
    kind: 'adjustment',
    sourceId: a.id,
    description: a.reason,
    lines: [line('operating_expense', value, 0), line('inventory', 0, value)],
  };
}

function receivableAccount(d: DebtEntry): AccountKey {
  if (d.partyKind === 'customer') return 'customer_receivable';
  return 'other_receivable';
}

function payableAccount(d: DebtEntry): AccountKey {
  if (d.partyKind === 'farmer') return 'farmer_payable';
  return 'other_payable';
}

/** قيد تسجيل دين يدوي (رصيد افتتاحي أو مستقل). */
export function journalForDebtEntry(d: DebtEntry): JournalEntry | null {
  const amount = debtRemainingAmount(d);
  if (amount <= 0.01) return null;
  const dir = resolveDebtDirection(d);
  const lines: JournalLine[] =
    dir === 'payable'
      ? [line('opening_equity', amount, 0), line(payableAccount(d), 0, amount)]
      : [line(receivableAccount(d), amount, 0), line('opening_equity', 0, amount)];
  return {
    id: `JE-${d.id}`,
    ref: d.ref,
    date: d.date,
    sessionId: d.sessionId,
    kind: 'debt',
    sourceId: d.id,
    description: d.description ?? 'دين مسجّل',
    lines,
  };
}

/** قيد مدخول خارج الخدمة. */
export function journalForExternalIncome(inc: ExternalIncome): JournalEntry {
  return {
    id: `JE-${inc.id}`,
    ref: inc.ref,
    date: inc.date,
    sessionId: inc.sessionId,
    kind: 'external_income',
    sourceId: inc.id,
    description: inc.description,
    lines: [line('cash', inc.amount, 0), line('revenue', 0, inc.amount)],
  };
}

/** قيد تسوية دين مرتبط بحركة نقدية. */
export function journalForDebtSettlement(cm: CashMovement, debt: DebtEntry | undefined): JournalEntry | null {
  if (cm.referenceType !== 'debt' || !debt) return null;
  const amount = cm.amount;
  const dir = resolveDebtDirection(debt);
  const lines: JournalLine[] =
    cm.direction === 'out'
      ? dir === 'payable'
        ? [line(payableAccount(debt), amount, 0), line('cash', 0, amount)]
        : [line('cash', amount, 0), line(receivableAccount(debt), 0, amount)]
      : dir === 'receivable'
        ? [line('cash', amount, 0), line(receivableAccount(debt), 0, amount)]
        : [line(payableAccount(debt), amount, 0), line('cash', 0, amount)];
  return {
    id: `JE-${cm.id}`,
    ref: cm.ref,
    date: cm.date,
    sessionId: cm.sessionId,
    kind: 'debt',
    sourceId: debt.id,
    description: cm.description,
    lines,
  };
}

export interface TrialBalanceRow {
  account: AccountKey;
  debit: number;
  credit: number;
  balance: number; // مدين موجب / دائن سالب
}

export function buildTrialBalance(entries: JournalEntry[]): {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
} {
  const acc: Record<string, { debit: number; credit: number }> = {};
  for (const e of entries) {
    for (const l of e.lines) {
      acc[l.account] = acc[l.account] ?? { debit: 0, credit: 0 };
      acc[l.account].debit += l.debit;
      acc[l.account].credit += l.credit;
    }
  }
  const rows: TrialBalanceRow[] = (Object.keys(acc) as AccountKey[]).map((a) => ({
    account: a,
    debit: round(acc[a].debit),
    credit: round(acc[a].credit),
    balance: round(acc[a].debit - acc[a].credit),
  }));
  const totalDebit = round(rows.reduce((s, r) => s + r.debit, 0));
  const totalCredit = round(rows.reduce((s, r) => s + r.credit, 0));
  return { rows, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 };
}

export interface ProfitAndLoss {
  revenue: number;
  cogs: number;
  grossProfit: number;
  /** هامش مجمل الربح ٪ من الإيرادات. */
  marginPct: number;
  /** خسائر الهدر والتلف (مصروف غير نقدي يُخصم من قيمة المخزون). */
  wasteLosses: number;
  /** المصاريف التشغيلية النقدية (عدا الهدر). */
  operatingExpenses: number;
  /** الرواتب والأجور المدفوعة. */
  salaries: number;
  /** صافي الربح/الخسارة بعد خصم الهدر وكل المصاريف. */
  netProfit: number;
  /** هامش صافي الربح ٪ من الإيرادات. */
  netMarginPct: number;
}

/** تكاليف ما دون مجمل الربح — تُخصم للوصول إلى صافي الربح. */
export interface PnLCosts {
  wasteLosses?: number;
  operatingExpenses?: number;
  salaries?: number;
}

export function computePnL(revenue: number, cogs: number, costs: PnLCosts = {}): ProfitAndLoss {
  const wasteLosses = round(costs.wasteLosses ?? 0);
  const operatingExpenses = round(costs.operatingExpenses ?? 0);
  const salaries = round(costs.salaries ?? 0);
  const grossProfit = round(revenue - cogs);
  const marginPct = revenue > 0 ? round((grossProfit / revenue) * 100) : 0;
  const netProfit = round(grossProfit - wasteLosses - operatingExpenses - salaries);
  const netMarginPct = revenue > 0 ? round((netProfit / revenue) * 100) : 0;
  return {
    revenue: round(revenue),
    cogs: round(cogs),
    grossProfit,
    marginPct,
    wasteLosses,
    operatingExpenses,
    salaries,
    netProfit,
    netMarginPct,
  };
}
