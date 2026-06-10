/**
 * تقسيم المبلغ بين خزنتين/بنكين — ربط حركات النقد بمجموعة واحدة.
 */

import { round } from './inventory';
import { accountBalance, accountLabel } from './treasury';
import type {
  AccountSourceType,
  BankAccount,
  CashMovement,
  CashMovementType,
  CashReferenceType,
  CashVault,
  TreasurySplitPart,
} from './types';

export type TreasurySourceInput = {
  amount: number;
  sourceType?: AccountSourceType;
  sourceId?: string;
  splits?: TreasurySplitPart[];
};

export type ResolvedTreasurySources =
  | { mode: 'none' }
  | { mode: 'single'; parts: TreasurySplitPart[] }
  | { mode: 'split'; parts: TreasurySplitPart[]; splitGroupId: string };

const SPLIT_TOLERANCE = 0.02;

export function resolveTreasurySources(
  input: TreasurySourceInput,
  splitGroupId = `split-${crypto.randomUUID()}`,
): ResolvedTreasurySources {
  const total = round(input.amount);
  if (total <= 0) return { mode: 'none' };

  const rawSplits = (input.splits ?? [])
    .map((p) => ({
      sourceType: p.sourceType,
      sourceId: p.sourceId,
      amount: round(p.amount),
    }))
    .filter((p) => p.amount > 0.001);

  if (rawSplits.length >= 2) {
    const sum = round(rawSplits.reduce((s, p) => s + p.amount, 0));
    if (Math.abs(sum - total) > SPLIT_TOLERANCE) {
      return { mode: 'none' };
    }
    const unique = new Set(rawSplits.map((p) => `${p.sourceType}:${p.sourceId}`));
    if (unique.size < 2) return { mode: 'none' };
    return { mode: 'split', parts: rawSplits, splitGroupId };
  }

  if (input.sourceType && input.sourceId) {
    return {
      mode: 'single',
      parts: [{ sourceType: input.sourceType, sourceId: input.sourceId, amount: total }],
    };
  }

  return { mode: 'none' };
}

export function validateSplitBalances(
  parts: TreasurySplitPart[],
  direction: 'in' | 'out',
  vaults: CashVault[],
  banks: BankAccount[],
  cashMovements: CashMovement[],
  creditBack: CashMovement[] = [],
): { ok: true } | { ok: false; error: string } {
  if (direction !== 'out') return { ok: true };

  for (const part of parts) {
    const bal = accountBalance(part.sourceType, part.sourceId, vaults, banks, cashMovements);
    const credited = creditBack
      .filter((m) => m.sourceType === part.sourceType && m.sourceId === part.sourceId)
      .reduce((s, m) => s + m.amount, 0);
    const effective = bal + credited;
    if (part.amount > effective + 0.001) {
      const label = accountLabel(part.sourceType, part.sourceId, vaults, banks);
      return {
        ok: false,
        error: `رصيد «${label}» لا يكفي لهذا الجزء (${Math.floor(effective).toLocaleString('ar-LY')} د.ل).`,
      };
    }
  }
  return { ok: true };
}

export function allocateSequentialRefs(
  prefix: string,
  count: number,
  existing: { ref: string }[],
  year = new Date().getFullYear(),
): string[] {
  const max = existing
    .map((e) => {
      const m = e.ref.match(/(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .reduce((a, b) => Math.max(a, b), 0);
  return Array.from(
    { length: count },
    (_, i) => `${prefix}-${year}-${String(max + 1 + i).padStart(4, '0')}`,
  );
}

export interface BuildSplitMovementsInput {
  parts: TreasurySplitPart[];
  totalAmount: number;
  splitGroupId?: string;
  movementType: CashMovementType;
  direction: 'in' | 'out';
  referenceType: CashReferenceType;
  referenceId: string;
  baseDescription: string;
  sessionId: string;
  date: string;
  createdBy?: string;
  vaults: CashVault[];
  banks: BankAccount[];
  existingRefs: { ref: string }[];
  createId: () => string;
}

export function buildSplitCashMovements(input: BuildSplitMovementsInput): CashMovement[] {
  const {
    parts,
    totalAmount,
    splitGroupId,
    movementType,
    direction,
    referenceType,
    referenceId,
    baseDescription,
    sessionId,
    date,
    createdBy,
    vaults,
    banks,
    existingRefs,
    createId,
  } = input;

  const partsSum = round(parts.reduce((s, p) => s + p.amount, 0));
  if (Math.abs(partsSum - round(totalAmount)) > SPLIT_TOLERANCE) {
    throw new Error('مجموع أجزاء الحركة لا يساوي المبلغ الإجمالي.');
  }

  const isSplit = parts.length >= 2 && !!splitGroupId;
  const count = parts.length;
  const refs = allocateSequentialRefs('CM', count, existingRefs);

  return parts.map((part, index) => {
    const splitIndex = index + 1;
    const otherParts = parts.filter((_, i) => i !== index);

    let description = baseDescription;
    if (isSplit) {
      description = `${baseDescription} — جزء ${splitIndex}/${count} (${round(part.amount).toLocaleString('ar-LY')} من ${round(totalAmount).toLocaleString('ar-LY')})`;
      if (otherParts.length === 1) {
        description += ` · الباقي: ${accountLabel(otherParts[0].sourceType, otherParts[0].sourceId, vaults, banks)}`;
      } else if (otherParts.length > 1) {
        description += ` · باقي الأجزاء: ${otherParts.map((p) => accountLabel(p.sourceType, p.sourceId, vaults, banks)).join('، ')}`;
      }
    }

    return {
      id: createId(),
      ref: refs[index],
      movementType,
      sourceType: part.sourceType,
      sourceId: part.sourceId,
      amount: round(part.amount),
      direction,
      referenceType,
      referenceId,
      description,
      sessionId,
      date,
      createdAt: new Date().toISOString(),
      createdBy,
      splitGroupId: isSplit ? splitGroupId : undefined,
      splitIndex: isSplit ? splitIndex : undefined,
      splitCount: isSplit ? count : undefined,
      splitTotalAmount: isSplit ? round(totalAmount) : undefined,
    } satisfies CashMovement;
  });
}

/** حركات مرتبطة بنفس عملية التقسيم */
export function getSplitSiblings(
  movement: CashMovement,
  allMovements: CashMovement[],
): CashMovement[] {
  if (!movement.splitGroupId) return [movement];
  return allMovements
    .filter((m) => m.splitGroupId === movement.splitGroupId)
    .sort((a, b) => (a.splitIndex ?? 0) - (b.splitIndex ?? 0));
}

export function formatSplitMovementHint(
  movement: CashMovement,
  allMovements: CashMovement[],
  vaults: CashVault[],
  banks: BankAccount[],
): string | null {
  if (!movement.splitGroupId || !movement.splitCount || movement.splitCount < 2) return null;
  const siblings = getSplitSiblings(movement, allMovements);
  const others = siblings.filter((m) => m.id !== movement.id);
  if (!others.length) return null;

  const total = movement.splitTotalAmount ?? siblings.reduce((s, m) => s + m.amount, 0);
  const parts = siblings
    .map((m) => `${accountLabel(m.sourceType, m.sourceId, vaults, banks)} (${round(m.amount).toLocaleString('ar-LY')})`)
    .join(' + ');

  return `دفعة مجزّأة ${round(total).toLocaleString('ar-LY')} — ${parts}`;
}

export function movementsForReference(
  cashMovements: CashMovement[],
  referenceType: CashReferenceType,
  referenceId: string,
): CashMovement[] {
  return cashMovements.filter(
    (m) => m.referenceType === referenceType && m.referenceId === referenceId,
  );
}

export function equalSplitAmounts(total: number): [number, number] {
  const t = round(total);
  const half = Math.floor(t / 2);
  return [half, round(t - half)];
}

export function paymentTreasuryMeta(resolved: ResolvedTreasurySources): {
  paidFromType?: AccountSourceType;
  paidFromId?: string;
  treasurySplits?: TreasurySplitPart[];
} {
  if (resolved.mode === 'none') return {};
  const first = resolved.parts[0];
  return {
    paidFromType: first.sourceType,
    paidFromId: first.sourceId,
    treasurySplits: resolved.mode === 'split' ? resolved.parts : undefined,
  };
}

/** يتحقق أن حركات مرجع واحد لا تتجاوز مبلغ العملية ولا تتكرر المراجع */
export function verifyReferenceMovements(
  movements: CashMovement[],
  referenceType: CashReferenceType,
  referenceId: string,
  expectedTotal: number,
): { ok: true } | { ok: false; error: string } {
  const linked = movementsForReference(movements, referenceType, referenceId);
  if (!linked.length) return { ok: true };
  const sum = round(linked.reduce((s, m) => s + m.amount, 0));
  if (Math.abs(sum - round(expectedTotal)) > SPLIT_TOLERANCE) {
    return {
      ok: false,
      error: `مجموع حركات الخزينة (${sum}) لا يطابق مبلغ العملية (${expectedTotal}).`,
    };
  }
  const refs = new Set(linked.map((m) => m.ref));
  if (refs.size !== linked.length) {
    return { ok: false, error: 'مراجع حركات الخزينة مكررة — خطأ في التقسيم.' };
  }
  return { ok: true };
}

export function formatPaymentTreasuryLabel(
  payment: {
    amount: number;
    paidFromType?: AccountSourceType;
    paidFromId?: string;
    treasurySplits?: TreasurySplitPart[];
  },
  vaults: CashVault[],
  banks: BankAccount[],
): string {
  if (payment.treasurySplits && payment.treasurySplits.length >= 2) {
    return payment.treasurySplits
      .map(
        (p) =>
          `${accountLabel(p.sourceType, p.sourceId, vaults, banks)} (${round(p.amount).toLocaleString('ar-LY')})`,
      )
      .join(' + ');
  }
  if (payment.paidFromType && payment.paidFromId) {
    return accountLabel(payment.paidFromType, payment.paidFromId, vaults, banks);
  }
  return 'بدون حركة نقدية';
}

export function validateTreasurySourceInput(
  input: TreasurySourceInput,
  options?: { allowNone?: boolean },
): string | null {
  const resolved = resolveTreasurySources(input);
  if (resolved.mode === 'none') {
    if (input.splits && input.splits.length >= 2) {
      const sum = round((input.splits ?? []).reduce((s, p) => s + p.amount, 0));
      if (Math.abs(sum - round(input.amount)) > SPLIT_TOLERANCE) {
        return 'مجموع أجزاء التقسيم يجب أن يساوي المبلغ الإجمالي.';
      }
      return 'تحقق من حسابي التقسيم — يجب اختيار حسابين مختلفين.';
    }
    return options?.allowNone ? null : 'اختر حساب الخزينة أو البنك.';
  }
  return null;
}
