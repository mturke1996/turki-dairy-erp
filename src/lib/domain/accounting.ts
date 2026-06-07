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
  JournalEntry,
  JournalLine,
  Payment,
  SaleTransaction,
  SupplyTransaction,
} from './types';
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
    description: 'توريد حليب خام من فلاح',
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

export function journalForPayment(p: Payment): JournalEntry {
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
  marginPct: number;
}

export function computePnL(revenue: number, cogs: number): ProfitAndLoss {
  const grossProfit = round(revenue - cogs);
  const marginPct = revenue > 0 ? round((grossProfit / revenue) * 100) : 0;
  return { revenue: round(revenue), cogs: round(cogs), grossProfit, marginPct };
}
