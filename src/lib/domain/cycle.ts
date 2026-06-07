/**
 * محرك الدورة نصف الشهرية (v3.0).
 * الشهر = دورتان: الأولى 1→15، الثانية 16→نهاية الشهر.
 * يحسب نافذة الدورة، تقدّمها الزمني، وإحصاءاتها من بيانات التوريد/المبيعات الفعلية.
 */

import { round } from './inventory';
import type { Payment, SaleTransaction, SupplyTransaction } from './types';

export const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export interface CycleWindow {
  cycleNumber: 1 | 2;
  month: number; // 0-based
  year: number;
  from: Date;
  to: Date;
  label: string;
}

const CYCLE_AR = ['١', '٢'] as const;

/** تسمية مختصرة مناسبة للشريط العلوي والجوال. */
export function cycleShortLabel(month: number, year: number, cycleNumber: 1 | 2): string {
  return `${AR_MONTHS[month]} ${year} · ${CYCLE_AR[cycleNumber - 1]}`;
}

/** أقصر للشاشات الضيقة جداً. */
export function cycleMicroLabel(month: number, cycleNumber: 1 | 2): string {
  return `${AR_MONTHS[month]} · ${CYCLE_AR[cycleNumber - 1]}`;
}

/** تسمية كاملة للقوائم والتقارير. */
export function cycleFullLabel(month: number, year: number, cycleNumber: 1 | 2): string {
  return `${AR_MONTHS[month]} ${year} — الدورة ${cycleNumber === 1 ? 'الأولى' : 'الثانية'}`;
}

export function sessionDisplayLabel(
  session: { label: string; periodFrom: string; cycleNumber?: 1 | 2 },
  variant: 'micro' | 'compact' | 'full' = 'compact',
): string {
  if (variant === 'full') return session.label;
  const d = new Date(`${session.periodFrom}T12:00:00`);
  const month = d.getMonth();
  const year = d.getFullYear();
  const n = session.cycleNumber ?? 1;
  if (variant === 'micro') return cycleMicroLabel(month, n);
  return cycleShortLabel(month, year, n);
}

export function cycleForDate(d: Date): CycleWindow {
  const day = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();
  const cycleNumber: 1 | 2 = day <= 15 ? 1 : 2;
  const from = cycleNumber === 1 ? new Date(year, month, 1) : new Date(year, month, 16);
  const to = cycleNumber === 1 ? new Date(year, month, 15) : new Date(year, month + 1, 0);
  return {
    cycleNumber,
    month,
    year,
    from,
    to,
    label: cycleFullLabel(month, year, cycleNumber),
  };
}

export function cycleOfMonth(year: number, month: number, cycleNumber: 1 | 2): CycleWindow {
  const from = cycleNumber === 1 ? new Date(year, month, 1) : new Date(year, month, 16);
  const to = cycleNumber === 1 ? new Date(year, month, 15) : new Date(year, month + 1, 0);
  return {
    cycleNumber,
    month,
    year,
    from,
    to,
    label: cycleFullLabel(month, year, cycleNumber),
  };
}

function inWindow(dateStr: string, from: Date, to: Date): boolean {
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return false;
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).getTime();
  return t >= from.getTime() && t <= end;
}

export interface CycleProgress {
  daysTotal: number;
  daysElapsed: number;
  daysRemaining: number;
  pct: number;
}

export function cycleProgress(window: CycleWindow, now: Date): CycleProgress {
  const dayMs = 86_400_000;
  const start = window.from.getTime();
  const end = new Date(window.to.getFullYear(), window.to.getMonth(), window.to.getDate(), 23, 59, 59).getTime();
  const daysTotal = Math.round((end - start) / dayMs) + 1;
  const elapsedRaw = Math.floor((now.getTime() - start) / dayMs) + 1;
  const daysElapsed = Math.max(0, Math.min(daysTotal, elapsedRaw));
  return {
    daysTotal,
    daysElapsed,
    daysRemaining: Math.max(0, daysTotal - daysElapsed),
    pct: daysTotal > 0 ? Math.round((daysElapsed / daysTotal) * 100) : 0,
  };
}

export interface CycleStats {
  supplied: number;
  sold: number;
  supplyCost: number;
  saleRevenue: number;
  cogs: number;
  grossProfit: number;
  marginPct: number;
  supplyCount: number;
  saleCount: number;
  farmerPaid: number;
  payoutsDue: number;
}

export function computeCycleStats(
  window: CycleWindow,
  supplies: SupplyTransaction[],
  sales: SaleTransaction[],
  payments: Payment[],
  saleCogs: Record<string, number>,
): CycleStats {
  const cs = supplies.filter((s) => inWindow(s.date, window.from, window.to));
  const cl = sales.filter((s) => inWindow(s.date, window.from, window.to));
  const fp = payments.filter((p) => p.kind === 'farmer_payment' && inWindow(p.date, window.from, window.to));

  const supplied = cs.reduce((a, s) => a + s.quantity, 0);
  const supplyCost = cs.reduce((a, s) => a + s.total, 0);
  const sold = cl.reduce((a, s) => a + s.quantity, 0);
  const saleRevenue = cl.reduce((a, s) => a + s.total, 0);
  const cogs = cl.reduce((a, s) => a + (saleCogs[s.id] ?? 0), 0);
  const grossProfit = saleRevenue - cogs;
  const farmerPaid = fp.reduce((a, p) => a + p.amount, 0);

  return {
    supplied: round(supplied),
    sold: round(sold),
    supplyCost: round(supplyCost),
    saleRevenue: round(saleRevenue),
    cogs: round(cogs),
    grossProfit: round(grossProfit),
    marginPct: saleRevenue > 0 ? round((grossProfit / saleRevenue) * 100, 1) : 0,
    supplyCount: cs.length,
    saleCount: cl.length,
    farmerPaid: round(farmerPaid),
    payoutsDue: round(Math.max(0, supplyCost - farmerPaid)),
  };
}

export interface CycleComparisonRow {
  metric: string;
  cycle1: number;
  cycle2: number;
  variance: number;
  variancePct: number;
  kind: 'liters' | 'money';
}

export function compareCycles(c1: CycleStats, c2: CycleStats): CycleComparisonRow[] {
  const mk = (metric: string, a: number, b: number, kind: 'liters' | 'money'): CycleComparisonRow => ({
    metric,
    cycle1: a,
    cycle2: b,
    variance: round(b - a),
    variancePct: a !== 0 ? round(((b - a) / Math.abs(a)) * 100, 1) : 0,
    kind,
  });
  return [
    mk('الكمية المورّدة', c1.supplied, c2.supplied, 'liters'),
    mk('الكمية المباعة', c1.sold, c2.sold, 'liters'),
    mk('تكلفة الشراء', c1.supplyCost, c2.supplyCost, 'money'),
    mk('إيرادات البيع', c1.saleRevenue, c2.saleRevenue, 'money'),
    mk('مجمل الربح', c1.grossProfit, c2.grossProfit, 'money'),
    mk('مستحقات الفلاحين', c1.payoutsDue, c2.payoutsDue, 'money'),
  ];
}
