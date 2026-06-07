/**
 * مولّد بيانات تجريبية واقعية لمصنع التركي.
 * فترتان: مايو 2026 (مؤرشفة) + يونيو 2026 (نشطة)، مع شبكة فلاحين وعملاء ليبيين
 * وحركات توريد/بيع/دفعات. يُستخدم RNG ببذرة ثابتة لنتائج مستقرة.
 */

import { buildInventoryLedger } from '@/lib/domain/inventory';
import { computeSessionSummary, type ErpData } from '@/lib/domain/calculations';
import type {
  Customer,
  CustomerType,
  Farmer,
  LivestockType,
  Payment,
  PriceTier,
  QualityTier,
  SaleTransaction,
  Session,
  SupplyTransaction,
} from '@/lib/domain/types';

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(73_910);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const between = (min: number, max: number) => min + rnd() * (max - min);
const intBetween = (min: number, max: number) => Math.floor(between(min, max + 1));
const r2 = (n: number) => Math.round(n * 100) / 100;

const REGIONS = [
  'تاجوراء',
  'سوق الجمعة',
  'عين زارة',
  'القره بوللي',
  'وادي الربيع',
  'قصر بن غشير',
  'سيدي السائح',
];

const FARMER_NAMES = [
  'عبدالسلام محمد التركي',
  'مفتاح علي الزروق',
  'خالد عمر بن سعيد',
  'الصديق رمضان القماطي',
  'ميلود سالم الفيتوري',
  'عبدالله أحمد الورفلي',
  'نصرالدين فتحي المبروك',
  'أسامة الهادي الزوي',
  'جمعة مسعود القذافي',
  'الطاهر عبدالحميد الشريف',
  'بشير محمود العماري',
  'فرج خليفة الدرسي',
  'عماد الدين علي الفلاح',
  'يوسف عبدالرحمن السنوسي',
];

const CUSTOMERS_SEED: { name: string; type: CustomerType; tier: PriceTier }[] = [
  { name: 'مصنع النخبة للأجبان والألبان', type: 'factory', tier: 'wholesale' },
  { name: 'شركة واحة الحليب للصناعات الغذائية', type: 'factory', tier: 'premium' },
  { name: 'ألبان المتوسط', type: 'factory', tier: 'wholesale' },
  { name: 'موزّع طرابلس المركزي للألبان', type: 'distributor', tier: 'wholesale' },
  { name: 'أسواق الربيع الكبرى', type: 'retailer', tier: 'standard' },
  { name: 'مخابز ومعجنات الأصيل', type: 'retailer', tier: 'standard' },
  { name: 'مصنع جبال نفوسة للأجبان', type: 'factory', tier: 'premium' },
  { name: 'محلات السنابل لمنتجات الألبان', type: 'retailer', tier: 'standard' },
];

const LIVESTOCK: LivestockType[] = ['cow', 'cow', 'cow', 'mixed', 'sheep', 'goat'];
const QUALITY: QualityTier[] = ['A', 'A', 'A', 'B', 'B', 'C'];

function iso(y: number, m: number, d: number, h = 9): string {
  return new Date(Date.UTC(y, m - 1, d, h, intBetween(0, 55))).toISOString();
}

let supCounter = 0;
let salCounter = 0;
let payCounter = 0;

function makeFarmers(): Farmer[] {
  return FARMER_NAMES.map((fullName, i) => {
    const tier = QUALITY[i % QUALITY.length];
    const livestock = LIVESTOCK[i % LIVESTOCK.length];
    const count = intBetween(8, 60);
    const yield_ = r2(count * between(6, 11));
    const base = tier === 'A' ? 1.95 : tier === 'B' ? 1.8 : 1.65;
    return {
      id: `farmer-${i + 1}`,
      code: `F-${String(i + 1).padStart(3, '0')}`,
      fullName,
      region: pick(REGIONS),
      phone: `09${pick(['1', '2', '3', '4'])}-${intBetween(2000000, 9999999)}`,
      livestockType: livestock,
      livestockCount: count,
      avgDailyYield: yield_,
      bankName: pick(['مصرف الجمهورية', 'المصرف التجاري الوطني', 'مصرف الوحدة']),
      bankAccount: `${intBetween(1000, 9999)}-${intBetween(100000, 999999)}`,
      iban: `LY${intBetween(10, 99)}${intBetween(100000000000, 999999999999)}`,
      qualityTier: tier,
      defaultBuyPrice: r2(base + between(-0.05, 0.08)),
      status: i === 9 ? 'suspended' : 'active',
      onboardingDate: iso(2024, intBetween(1, 12), intBetween(1, 28)),
      notes: '',
      createdAt: iso(2024, 1, 1),
    } satisfies Farmer;
  });
}

function makeCustomers(): Customer[] {
  return CUSTOMERS_SEED.map((c, i) => {
    const base = c.tier === 'premium' ? 2.7 : c.tier === 'wholesale' ? 2.45 : 2.6;
    return {
      id: `customer-${i + 1}`,
      code: `C-${String(i + 1).padStart(3, '0')}`,
      entityName: c.name,
      entityType: c.type,
      taxNumber: `${intBetween(100000, 999999)}`,
      phone: `02${intBetween(10000000, 99999999)}`,
      creditLimit: c.type === 'factory' ? intBetween(40, 90) * 1000 : intBetween(10, 30) * 1000,
      paymentTerms: c.type === 'factory' ? 30 : c.type === 'distributor' ? 21 : 14,
      priceTier: c.tier,
      defaultSellPrice: r2(base + between(-0.05, 0.1)),
      onHold: i === 7,
      onboardingDate: iso(2024, intBetween(1, 12), intBetween(1, 28)),
      notes: '',
      createdAt: iso(2024, 1, 1),
    } satisfies Customer;
  });
}

function genSupplies(
  sessionId: string,
  farmers: Farmer[],
  year: number,
  month: number,
  days: number[],
): SupplyTransaction[] {
  const out: SupplyTransaction[] = [];
  for (const d of days) {
    const active = farmers.filter((f) => f.status === 'active' && rnd() > 0.18);
    for (const f of active) {
      const qty = r2((f.avgDailyYield ?? 45) * between(0.82, 1.12));
      const unitPrice = r2(f.defaultBuyPrice + between(-0.04, 0.04));
      supCounter += 1;
      out.push({
        id: `sup-${sessionId}-${supCounter}`,
        ref: `SUP-${year}-${String(supCounter).padStart(4, '0')}`,
        farmerId: f.id,
        sessionId,
        date: iso(year, month, d, 8),
        quantity: qty,
        unitPrice,
        total: r2(qty * unitPrice),
        qualityTier: f.qualityTier,
        fatPct: r2(between(3.1, 4.4)),
        notes: '',
        createdAt: iso(year, month, d, 8),
      });
    }
  }
  return out;
}

function genSales(
  sessionId: string,
  customers: Customer[],
  year: number,
  month: number,
  days: number[],
): SaleTransaction[] {
  const out: SaleTransaction[] = [];
  for (const d of days) {
    const buyers = customers.filter((c) => !c.onHold && rnd() > 0.45);
    for (const c of buyers) {
      const qty = r2(between(c.entityType === 'factory' ? 700 : 150, c.entityType === 'factory' ? 2600 : 700));
      const unitPrice = r2(c.defaultSellPrice + between(-0.05, 0.05));
      salCounter += 1;
      const dueOffset = c.paymentTerms;
      const dueDate = new Date(Date.UTC(year, month - 1, d + dueOffset, 12)).toISOString();
      out.push({
        id: `sal-${sessionId}-${salCounter}`,
        ref: `SAL-${year}-${String(salCounter).padStart(4, '0')}`,
        customerId: c.id,
        sessionId,
        date: iso(year, month, d, 14),
        quantity: qty,
        unitPrice,
        total: r2(qty * unitPrice),
        dueDate,
        notes: '',
        createdAt: iso(year, month, d, 14),
      });
    }
  }
  return out;
}

function genFarmerPayments(
  sessionId: string,
  farmers: Farmer[],
  supplies: SupplyTransaction[],
  year: number,
  month: number,
  ratio: number,
): Payment[] {
  const out: Payment[] = [];
  for (const f of farmers) {
    const owed = supplies.filter((s) => s.farmerId === f.id).reduce((s, x) => s + x.total, 0);
    if (owed <= 0) continue;
    if (rnd() > 0.25) {
      payCounter += 1;
      out.push({
        id: `pay-f-${sessionId}-${payCounter}`,
        ref: `PAY-${year}-${String(payCounter).padStart(4, '0')}`,
        kind: 'farmer_payment',
        partyId: f.id,
        sessionId,
        date: iso(year, month, intBetween(10, 26), 11),
        amount: r2(owed * between(ratio * 0.6, ratio)),
        method: pick(['cash', 'bank', 'bank']),
        notes: 'دفعة على الحساب',
        createdAt: iso(year, month, 26, 11),
      });
    }
  }
  return out;
}

function genCustomerReceipts(
  sessionId: string,
  customers: Customer[],
  sales: SaleTransaction[],
  year: number,
  month: number,
  ratio: number,
): Payment[] {
  const out: Payment[] = [];
  for (const c of customers) {
    const owed = sales.filter((s) => s.customerId === c.id).reduce((s, x) => s + x.total, 0);
    if (owed <= 0) continue;
    if (rnd() > 0.3) {
      payCounter += 1;
      out.push({
        id: `pay-c-${sessionId}-${payCounter}`,
        ref: `RCV-${year}-${String(payCounter).padStart(4, '0')}`,
        kind: 'customer_payment',
        partyId: c.id,
        sessionId,
        date: iso(year, month, intBetween(12, 27), 13),
        amount: r2(owed * between(ratio * 0.5, ratio)),
        method: pick(['bank', 'cash', 'cheque']),
        notes: 'تحصيل على الحساب',
        createdAt: iso(year, month, 27, 13),
      });
    }
  }
  return out;
}

export interface SeedResult {
  sessions: Session[];
  activeSessionId: string;
  farmers: Farmer[];
  customers: Customer[];
  supplies: SupplyTransaction[];
  sales: SaleTransaction[];
  payments: Payment[];
}

export function generateSeed(): SeedResult {
  supCounter = 0;
  salCounter = 0;
  payCounter = 0;

  const farmers = makeFarmers();
  const customers = makeCustomers();

  // ── الفترة المؤرشفة: مايو 2026 ──
  const mayId = 'session-2026-05';
  const mayDays = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29];
  const maySupplies = genSupplies(mayId, farmers, 2026, 5, mayDays);
  const maySales = genSales(mayId, customers, 2026, 5, mayDays);
  const mayFarmerPays = genFarmerPayments(mayId, farmers, maySupplies, 2026, 5, 0.9);
  const mayReceipts = genCustomerReceipts(mayId, customers, maySales, 2026, 5, 0.85);

  let may: Session = {
    id: mayId,
    label: 'مايو 2026',
    periodFrom: '2026-05-01',
    periodTo: '2026-05-31',
    status: 'archived',
    openingStock: 0,
    openingAvgCost: 0,
    openingPayables: 0,
    openingReceivables: 0,
    createdAt: iso(2026, 5, 1, 0),
    closedAt: iso(2026, 5, 31, 23),
  };

  // مخزون مايو فقط لاحتساب رصيد الإقفال والمتوسط المرجّح
  const mayInv = buildInventoryLedger(maySupplies, maySales, [], [may]);
  const mayPayables = maySupplies.reduce((s, x) => s + x.total, 0) - mayFarmerPays.reduce((s, x) => s + x.amount, 0);
  const mayReceivables = maySales.reduce((s, x) => s + x.total, 0) - mayReceipts.reduce((s, x) => s + x.amount, 0);

  // ── الفترة النشطة: يونيو 2026 (حتى اليوم 7) ──
  const junId = 'session-2026-06';
  const junDays = [1, 2, 3, 4, 5, 6, 7];
  const junSupplies = genSupplies(junId, farmers, 2026, 6, junDays);
  const junSales = genSales(junId, customers, 2026, 6, junDays);
  const junFarmerPays = genFarmerPayments(junId, farmers, junSupplies, 2026, 6, 0.45);
  const junReceipts = genCustomerReceipts(junId, customers, junSales, 2026, 6, 0.4);

  const june: Session = {
    id: junId,
    label: 'يونيو 2026',
    periodFrom: '2026-06-01',
    periodTo: '2026-06-30',
    status: 'open',
    openingStock: mayInv.currentStock,
    openingAvgCost: r2(mayInv.currentWac),
    openingPayables: r2(Math.max(0, mayPayables)),
    openingReceivables: r2(Math.max(0, mayReceivables)),
    createdAt: iso(2026, 6, 1, 0),
  };

  const supplies = [...maySupplies, ...junSupplies];
  const sales = [...maySales, ...junSales];
  const payments = [...mayFarmerPays, ...mayReceipts, ...junFarmerPays, ...junReceipts];

  // أرشيف مايو الحقيقي
  const data: ErpData = {
    sessions: [may, june],
    activeSessionId: junId,
    farmers,
    customers,
    supplies,
    sales,
    payments,
    adjustments: [],
    expenses: [],
    payrollBatches: [],
    vaults: [],
    banks: [],
    cashMovements: [],
    settings: { minStockThreshold: 5000, defaultBuyPrice: 1.85, defaultSellPrice: 2.55 },
  };
  const fullInv = buildInventoryLedger(supplies, sales, [], [may, june]);
  const maySummary = computeSessionSummary(may, data, fullInv);
  may = {
    ...may,
    archive: {
      summary: {
        supply: { transactions: maySummary.supplyCount, qty: maySummary.supplyQty, cost: maySummary.supplyCost },
        sales: {
          transactions: maySummary.salesCount,
          qty: maySummary.salesQty,
          revenue: maySummary.salesRevenue,
          cogs: maySummary.cogs,
        },
        profit: { gross: maySummary.grossProfit, marginPct: maySummary.marginPct },
        inventory: {
          opening: 0,
          closing: mayInv.currentStock,
          variance: mayInv.currentStock,
        },
        cash: { farmerPayments: maySummary.farmerPayments, customerReceipts: maySummary.customerReceipts },
      },
      balancesSnapshot: {
        farmers: farmers.slice(0, 8).map((f) => ({
          id: f.id,
          name: f.fullName,
          balance: r2(
            maySupplies.filter((s) => s.farmerId === f.id).reduce((s, x) => s + x.total, 0) -
              mayFarmerPays.filter((p) => p.partyId === f.id).reduce((s, x) => s + x.amount, 0),
          ),
        })),
        customers: customers.slice(0, 8).map((c) => ({
          id: c.id,
          name: c.entityName,
          balance: r2(
            maySales.filter((s) => s.customerId === c.id).reduce((s, x) => s + x.total, 0) -
              mayReceipts.filter((p) => p.partyId === c.id).reduce((s, x) => s + x.amount, 0),
          ),
        })),
      },
      carryForward: {
        openingStock: mayInv.currentStock,
        payables: r2(Math.max(0, mayPayables)),
        receivables: r2(Math.max(0, mayReceivables)),
      },
    },
  };

  return {
    sessions: [may, june],
    activeSessionId: junId,
    farmers,
    customers,
    supplies,
    sales,
    payments,
  };
}
