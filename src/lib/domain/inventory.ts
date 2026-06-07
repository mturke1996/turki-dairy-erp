/**
 * محرّك المخزون المركزي — متوسط التكلفة المرجّح المتحرّك (Moving Weighted Average Cost).
 *
 * القاعدة الذهبية:
 *   current_stock = Σ supply.qty − Σ sale.qty ± adjustments + opening_stock
 *
 * كل عملية بيع تُسعَّر بتكلفتها وفق متوسط التكلفة المرجّح لحظة البيع، فينتج عنها
 * تكلفة بضاعة مباعة (COGS) دقيقة تُستخدم في المحرّك المحاسبي وحساب الأرباح.
 */

import type {
  InventoryAdjustment,
  InventoryLedgerEntry,
  SaleTransaction,
  Session,
  SupplyTransaction,
} from './types';

export interface InventoryResult {
  /** الدفتر الزمني الكامل لكل الحركات */
  entries: InventoryLedgerEntry[];
  /** تكلفة كل عملية بيع (saleId → cogs) */
  saleCogs: Record<string, number>;
  /** الرصيد النهائي الحالي */
  currentStock: number;
  currentValue: number;
  /** متوسط التكلفة المرجّح الحالي */
  currentWac: number;
}

type Event =
  | { t: 'opening'; date: string; sessionId: string; qty: number; cost: number; id: string }
  | { t: 'supply'; date: string; sortKey: string; data: SupplyTransaction }
  | { t: 'sale'; date: string; sortKey: string; data: SaleTransaction }
  | { t: 'adjustment'; date: string; sortKey: string; data: InventoryAdjustment };

function ts(date: string, fallback: string): number {
  const a = new Date(date).getTime();
  if (!Number.isNaN(a)) return a;
  const b = new Date(fallback).getTime();
  return Number.isNaN(b) ? 0 : b;
}

/**
 * يبني الدفتر عبر كل الفترات بترتيب زمني واحد متّصل (الرصيد يُرحَّل تلقائياً).
 * يضيف حركة افتتاحية واحدة فقط لأقدم فترة إن كان لها رصيد افتتاحي.
 */
export function buildInventoryLedger(
  supplies: SupplyTransaction[],
  sales: SaleTransaction[],
  adjustments: InventoryAdjustment[],
  sessions: Session[],
): InventoryResult {
  const events: Event[] = [];

  // رصيد افتتاحي لأقدم فترة فقط (الباقي مُرحّل ضمن الحركات)
  const sorted = [...sessions].sort((a, b) => ts(a.periodFrom, a.createdAt) - ts(b.periodFrom, b.createdAt));
  const earliest = sorted[0];
  if (earliest && earliest.openingStock > 0) {
    events.push({
      t: 'opening',
      date: earliest.periodFrom,
      sessionId: earliest.id,
      qty: earliest.openingStock,
      cost: earliest.openingAvgCost,
      id: `OPEN-${earliest.id}`,
    });
  }

  for (const s of supplies) events.push({ t: 'supply', date: s.date, sortKey: s.createdAt, data: s });
  for (const s of sales) events.push({ t: 'sale', date: s.date, sortKey: s.createdAt, data: s });
  for (const a of adjustments)
    events.push({ t: 'adjustment', date: a.date, sortKey: a.createdAt, data: a });

  events.sort((a, b) => {
    const da = ts(a.date, a.t === 'opening' ? a.date : a.sortKey);
    const db = ts(b.date, b.t === 'opening' ? b.date : b.sortKey);
    if (da !== db) return da - db;
    // الافتتاحي أولاً، ثم التوريد، ثم التسوية، ثم البيع
    const order = { opening: 0, supply: 1, adjustment: 2, sale: 3 } as const;
    return order[a.t] - order[b.t];
  });

  const entries: InventoryLedgerEntry[] = [];
  const saleCogs: Record<string, number> = {};

  let qty = 0;
  let value = 0;

  for (const ev of events) {
    if (ev.t === 'opening') {
      qty += ev.qty;
      value += ev.qty * ev.cost;
      entries.push({
        id: ev.id,
        ref: 'افتتاحي',
        date: ev.date,
        sessionId: ev.sessionId,
        movementType: 'OPENING',
        sourceKind: 'opening',
        sourceId: ev.id,
        label: 'رصيد افتتاحي مُرحّل',
        quantityIn: ev.qty,
        quantityOut: 0,
        unitCost: ev.cost,
        balanceAfter: qty,
        valueAfter: value,
      });
    } else if (ev.t === 'supply') {
      const s = ev.data;
      qty += s.quantity;
      value += s.total;
      entries.push({
        id: `LED-${s.id}`,
        ref: s.ref,
        date: s.date,
        sessionId: s.sessionId,
        movementType: 'IN',
        sourceKind: 'supply',
        sourceId: s.id,
        label: 'استلام حليب خام',
        quantityIn: s.quantity,
        quantityOut: 0,
        unitCost: s.unitPrice,
        balanceAfter: qty,
        valueAfter: value,
      });
    } else if (ev.t === 'adjustment') {
      const a = ev.data;
      const wac = qty > 0 ? value / qty : a.unitCost;
      qty += a.quantity;
      value += a.quantity * (a.quantity >= 0 ? a.unitCost : wac);
      if (qty < 0) qty = 0;
      if (value < 0) value = 0;
      entries.push({
        id: `LED-${a.id}`,
        ref: a.ref,
        date: a.date,
        sessionId: a.sessionId,
        movementType: 'ADJUSTMENT',
        sourceKind: 'adjustment',
        sourceId: a.id,
        label: a.reason || 'تسوية مخزون',
        quantityIn: a.quantity > 0 ? a.quantity : 0,
        quantityOut: a.quantity < 0 ? Math.abs(a.quantity) : 0,
        unitCost: a.quantity >= 0 ? a.unitCost : wac,
        balanceAfter: qty,
        valueAfter: value,
      });
    } else {
      // sale
      const s = ev.data;
      const wac = qty > 0 ? value / qty : 0;
      const cogs = s.quantity * wac;
      qty -= s.quantity;
      value -= cogs;
      if (qty < 0) qty = 0;
      if (value < 0) value = 0;
      saleCogs[s.id] = cogs;
      entries.push({
        id: `LED-${s.id}`,
        ref: s.ref,
        date: s.date,
        sessionId: s.sessionId,
        movementType: 'OUT',
        sourceKind: 'sale',
        sourceId: s.id,
        label: 'بيع بالجملة',
        quantityIn: 0,
        quantityOut: s.quantity,
        unitCost: wac,
        balanceAfter: qty,
        valueAfter: value,
      });
    }
  }

  return {
    entries,
    saleCogs,
    currentStock: round(qty),
    currentValue: round(value),
    currentWac: qty > 0 ? value / qty : 0,
  };
}

/** صف افتتاحي/مرحّل لعرض دفتر دورة محددة (لا يغيّر الرصيد العالمي). */
export function carryForwardEntry(session: Session): InventoryLedgerEntry | null {
  if (session.openingStock <= 0) return null;
  return {
    id: `CARRY-${session.id}`,
    ref: 'مرحّل',
    date: session.periodFrom,
    sessionId: session.id,
    movementType: 'CARRY_FORWARD',
    sourceKind: 'opening',
    sourceId: session.id,
    label: 'رصيد مرحّل من الدورة السابقة',
    quantityIn: session.openingStock,
    quantityOut: 0,
    unitCost: session.openingAvgCost,
    balanceAfter: session.openingStock,
    valueAfter: round(session.openingStock * session.openingAvgCost),
  };
}

/** دفتر حركة دورة واحدة مع صف الترحيل. */
export function sessionLedgerEntries(
  session: Session,
  allEntries: InventoryLedgerEntry[],
): InventoryLedgerEntry[] {
  const carry = carryForwardEntry(session);
  const inSession = allEntries.filter((e) => e.sessionId === session.id);
  const merged = carry ? [carry, ...inSession] : inSession;
  return merged.sort((a, b) => b.date.localeCompare(a.date));
}

export function round(n: number, d = 2): number {
  const f = 10 ** d;
  return Math.round((n + Number.EPSILON) * f) / f;
}
