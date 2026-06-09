/**
 * منطق الديون — اتجاه (له/عليه) وتأثير على الأرصدة.
 */

import type { DebtEntry, DebtPartyKind } from './types';

export type DebtDirection = 'payable' | 'receivable';

/** الاتجاه الافتراضي حسب نوع الطرف (للسجلات القديمة بدون direction). */
export function resolveDebtDirection(entry: Pick<DebtEntry, 'partyKind' | 'direction'>): DebtDirection {
  if (entry.direction) return entry.direction;
  if (entry.partyKind === 'farmer') return 'payable';
  if (entry.partyKind === 'customer' || entry.partyKind === 'employee') return 'receivable';
  return 'payable';
}

/** المبلغ المتبقي على دين مسجّل (amount يُخفَّض عند كل تسوية). */
export function debtRemainingAmount(entry: Pick<DebtEntry, 'amount'>): number {
  return Math.max(0, entry.amount);
}

export function isDebtFullySettled(entry: Pick<DebtEntry, 'amount' | 'settledAt'>): boolean {
  return entry.amount <= 0.01 || Boolean(entry.settledAt);
}

/** تطبيق مبلغ تسوية على سجل دين واحد. */
export function applySettlementToEntry(entry: DebtEntry, amount: number): DebtEntry {
  const apply = Math.max(0, amount);
  const remaining = debtRemainingAmount(entry);
  const settled = Math.min(apply, remaining);
  const newAmount = Math.max(0, entry.amount - settled);
  const newSettled = (entry.settledAmount ?? 0) + settled;
  const fullySettled = newAmount <= 0.01;
  return {
    ...entry,
    amount: newAmount,
    settledAmount: newSettled,
    settledAt: fullySettled ? new Date().toISOString() : entry.settledAt,
  };
}

/**
 * يخصّص دفعة/تحصيل على ديون مسجّلة للطرف (الأقدم أولاً).
 * يُستخدم مع recordFarmerPayment / recordCustomerPayment لتجنّب ازدواجية الأرصدة.
 */
export function allocatePaymentToPartyDebts(
  entries: DebtEntry[],
  partyKind: DebtPartyKind,
  partyId: string,
  paymentAmount: number,
  directions: DebtDirection[],
): { entries: DebtEntry[]; updates: DebtEntry[]; applied: number } {
  if (paymentAmount <= 0.001) return { entries, updates: [], applied: 0 };

  let remaining = paymentAmount;
  const updates: DebtEntry[] = [];
  const next = entries.map((e) => ({ ...e }));

  const candidates = next
    .filter(
      (e) =>
        e.partyKind === partyKind &&
        e.partyId === partyId &&
        !isDebtFullySettled(e) &&
        directions.includes(resolveDebtDirection(e)),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

  for (const entry of candidates) {
    if (remaining <= 0.001) break;
    const idx = next.findIndex((e) => e.id === entry.id);
    if (idx < 0) continue;
    const apply = Math.min(remaining, debtRemainingAmount(entry));
    if (apply <= 0.001) continue;
    const updated = applySettlementToEntry(next[idx], apply);
    next[idx] = updated;
    updates.push(updated);
    remaining -= apply;
  }

  return { entries: next, updates, applied: paymentAmount - remaining };
}

/** مساهمة الدين في رصيد الطرف (+ يزيد الالتزام/الذمة حسب النوع). */
export function debtBalanceContribution(entry: DebtEntry): number {
  const remaining = debtRemainingAmount(entry);
  if (remaining <= 0.01) return 0;
  const dir = resolveDebtDirection(entry);
  switch (entry.partyKind) {
    case 'farmer':
      return dir === 'payable' ? remaining : -remaining;
    case 'customer':
      return dir === 'receivable' ? remaining : -remaining;
    case 'employee':
      return dir === 'receivable' ? remaining : -remaining;
    case 'external':
      return dir === 'receivable' ? remaining : -remaining;
    default:
      return remaining;
  }
}

/** true = صرف نقدي (علينا)، false = تحصيل (لنا) */
export function debtSettlementIsCashOut(entry: Pick<DebtEntry, 'partyKind' | 'direction'>): boolean {
  return resolveDebtDirection(entry) === 'payable';
}

export const DEBT_DIRECTION_LABELS: Record<DebtDirection, string> = {
  payable: 'له (علينا)',
  receivable: 'عليه (لنا)',
};

/** الاتجاه الافتراضي المقترح عند اختيار نوع طرف. */
export function defaultDebtDirection(partyKind: DebtPartyKind): DebtDirection {
  if (partyKind === 'farmer') return 'payable';
  if (partyKind === 'customer' || partyKind === 'employee') return 'receivable';
  return 'payable';
}
