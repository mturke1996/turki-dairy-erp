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
