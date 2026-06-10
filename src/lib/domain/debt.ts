/**
 * منطق الديون — اتجاه (له/عليه) وتأثير على الأرصدة.
 */

import type { DebtEntry, DebtPartyKind, Payment } from "./types";

export type DebtDirection = "payable" | "receivable";

/** الاتجاه الافتراضي حسب نوع الطرف (للسجلات القديمة بدون direction). */
export function resolveDebtDirection(
  entry: Pick<DebtEntry, "partyKind" | "direction">,
): DebtDirection {
  if (entry.direction) return entry.direction;
  if (entry.partyKind === "farmer") return "payable";
  if (entry.partyKind === "customer" || entry.partyKind === "employee")
    return "receivable";
  return "payable";
}

/** المبلغ المتبقي على دين مسجّل (amount يُخفَّض عند كل تسوية). */
export function debtRemainingAmount(entry: Pick<DebtEntry, "amount">): number {
  return Math.max(0, entry.amount);
}

export function isDebtFullySettled(
  entry: Pick<DebtEntry, "amount" | "settledAt">,
): boolean {
  return entry.amount <= 0.01 || Boolean(entry.settledAt);
}

/** تطبيق مبلغ تسوية على سجل دين واحد. */
export function applySettlementToEntry(
  entry: DebtEntry,
  amount: number,
): DebtEntry {
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
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
    );

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

/** يسترجع جزء الدفعة المُطبَّق سابقاً على الديون (عند التعديل أو الحذف). */
export function reversePaymentDebtAllocation(
  entries: DebtEntry[],
  partyKind: DebtPartyKind,
  partyId: string,
  payment: Pick<Payment, "debtSettledAmount">,
): DebtEntry[] {
  let toRestore = payment.debtSettledAmount ?? 0;
  if (toRestore <= 0.001) return entries;

  const next = entries.map((e) => ({ ...e }));
  const candidates = next
    .filter(
      (e) =>
        e.partyKind === partyKind &&
        e.partyId === partyId &&
        (e.settledAmount ?? 0) > 0.001,
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );

  for (const entry of candidates) {
    if (toRestore <= 0.001) break;
    const idx = next.findIndex((e) => e.id === entry.id);
    if (idx < 0) continue;
    const restore = Math.min(toRestore, entry.settledAmount ?? 0);
    if (restore <= 0.001) continue;
    const newAmount = entry.amount + restore;
    const newSettled = Math.max(0, (entry.settledAmount ?? 0) - restore);
    next[idx] = {
      ...next[idx],
      amount: newAmount,
      settledAmount: newSettled > 0.001 ? newSettled : undefined,
      settledAt: newAmount > 0.01 ? undefined : next[idx].settledAt,
    };
    toRestore -= restore;
  }
  return next;
}

/** جزء الدفعة المُطبَّق على الاستلام/البيع (بعد خصم الديون المسجّلة). */
export function paymentNetOfDebtSettlement(
  p: Pick<Payment, "amount" | "debtSettledAmount">,
): number {
  return Math.max(0, p.amount - (p.debtSettledAmount ?? 0));
}

/** مساهمة الدين في رصيد الطرف (+ يزيد الالتزام/الذمة حسب النوع). */
export function debtBalanceContribution(entry: DebtEntry): number {
  const remaining = debtRemainingAmount(entry);
  if (remaining <= 0.01) return 0;
  const dir = resolveDebtDirection(entry);
  switch (entry.partyKind) {
    case "farmer":
      return dir === "payable" ? remaining : -remaining;
    case "customer":
      return dir === "receivable" ? remaining : -remaining;
    case "employee":
      return dir === "receivable" ? remaining : -remaining;
    case "external":
      return dir === "receivable" ? remaining : -remaining;
    default:
      return remaining;
  }
}

/** true = صرف نقدي (علينا)، false = تحصيل (لنا) */
export function debtSettlementIsCashOut(
  entry: Pick<DebtEntry, "partyKind" | "direction">,
): boolean {
  return resolveDebtDirection(entry) === "payable";
}

export const DEBT_DIRECTION_LABELS: Record<DebtDirection, string> = {
  payable: "له (علينا)",
  receivable: "عليه (لنا)",
};

/** الاتجاه الافتراضي المقترح عند اختيار نوع طرف. */
export function defaultDebtDirection(partyKind: DebtPartyKind): DebtDirection {
  if (partyKind === "farmer") return "payable";
  if (partyKind === "customer" || partyKind === "employee") return "receivable";
  return "payable";
}

/** ربط تسجيل الدين بحركة نقدية فورية. */
export type DebtCashMode = "none" | "disburse" | "collect";

export const DEBT_CASH_MODE_LABELS: Record<DebtCashMode, string> = {
  none: "تسجيل محاسبي فقط",
  disburse: "صرف من الخزينة",
  collect: "إيداع في الخزينة",
};

/** اتجاه الحركة النقدية عند تسجيل الدين. */
export function debtRecordCashDirection(
  cashMode: DebtCashMode,
): "out" | "in" | null {
  if (cashMode === "disburse") return "out";
  if (cashMode === "collect") return "in";
  return null;
}

/**
 * مبلغ التسوية الفورية عند التسجيل مع خزينة:
 * - صرف + «له» = دفع جزء/كل الدين (يُخفَّض الرصيد).
 * - تحصيل + «عليه» = تحصيل جزء/كل الدين.
 * - صرف + «عليه» = سلفة (لا تسوية — يبقى الدين كاملاً).
 */
export function debtRecordSettleAmount(
  direction: DebtDirection,
  cashMode: "disburse" | "collect",
  debtAmount: number,
  cashAmount: number,
): number {
  const cash = Math.max(0, cashAmount);
  const debt = Math.max(0, debtAmount);
  if (cashMode === "disburse" && direction === "payable") {
    return Math.min(debt, cash);
  }
  if (cashMode === "collect" && direction === "receivable") {
    return Math.min(debt, cash);
  }
  return 0;
}

/** سلفة نقدية عند التسجيل (صرف + عليه) — قيد واحد بدون قيد افتتاحي منفصل. */
export function debtRecordIsAdvanceDisbursement(
  direction: DebtDirection,
  cashMode: DebtCashMode,
): boolean {
  return cashMode === "disburse" && direction === "receivable";
}
