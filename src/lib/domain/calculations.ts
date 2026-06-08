/**
 * طبقة المشتقّات والتحليلات — تحوّل البيانات الخام إلى أرصدة ومؤشرات وتقارير.
 * كل الدوال نقية (pure) لإعادة استخدامها في الواجهة وفي مستندات الـ PDF.
 */

import {
  buildTrialBalance,
  computePnL,
  journalForAdjustment,
  journalForExpense,
  journalForPayment,
  journalForPayroll,
  journalForSale,
  journalForSupply,
} from './accounting';
import { buildInventoryLedger, round, type InventoryResult } from './inventory';
import { computeTreasury } from './treasury';
import type {
  BankAccount,
  CashMovement,
  CashVault,
  Customer,
  DebtEntry,
  DebtPartyKind,
  Employee,
  Expense,
  Farmer,
  InventoryAdjustment,
  JournalEntry,
  Payment,
  PayrollBatch,
  SaleTransaction,
  Session,
  SupplyTransaction,
  SystemAlert,
} from './types';

export interface ErpData {
  sessions: Session[];
  activeSessionId: string;
  farmers: Farmer[];
  customers: Customer[];
  employees: Employee[];
  supplies: SupplyTransaction[];
  sales: SaleTransaction[];
  payments: Payment[];
  debtEntries: DebtEntry[];
  adjustments: InventoryAdjustment[];
  expenses: Expense[];
  payrollBatches: PayrollBatch[];
  vaults: CashVault[];
  banks: BankAccount[];
  cashMovements: CashMovement[];
  settings: { minStockThreshold: number; defaultBuyPrice: number; defaultSellPrice: number };
}

export interface FarmerStats extends Farmer {
  creditBalance: number;
  totalSupplied: number;
  totalSupplyValue: number;
  paidTotal: number;
  avgPrice: number;
  supplyCount: number;
  lastSupplyDate?: string;
}

export interface CustomerStats extends Customer {
  outstanding: number;
  totalPurchased: number;
  totalRevenue: number;
  receivedTotal: number;
  avgPrice: number;
  saleCount: number;
  overdueAmount: number;
  creditUtilization: number;
  lastSaleDate?: string;
}

export interface EmployeeStats extends Employee {
  grossSalary: number;
  advanceBalance: number;
  advancesTotal: number;
  advancesRecovered: number;
  ytdPaid: number;
  lastPayrollDate?: string;
  payrollCount: number;
}

export type { DebtPartyKind };

/** صف موحّد في مركز الديون */
export interface DebtLedgerRow {
  id: string;
  kind: DebtPartyKind;
  code: string;
  name: string;
  subtitle: string;
  balance: number;
  /** payable = علينا للطرف، receivable = على الطرف لنا */
  direction: 'payable' | 'receivable';
  statusLabel: string;
  phone?: string;
}

export interface DebtSummary {
  farmerPayables: number;
  customerReceivables: number;
  employeeAdvances: number;
  totalPayables: number;
  totalReceivables: number;
  netPosition: number;
  rows: DebtLedgerRow[];
}

export interface AgingBuckets {
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90_plus: number;
}

const sum = (arr: number[]) => arr.reduce((s, n) => s + n, 0);

// ============================================================
// الفلاحون
// ============================================================
export function computeFarmerStats(
  farmer: Farmer,
  supplies: SupplyTransaction[],
  payments: Payment[],
  debtEntries: DebtEntry[] = [],
): FarmerStats {
  const fs = supplies.filter((s) => s.farmerId === farmer.id);
  const ps = payments.filter((p) => p.kind === 'farmer_payment' && p.partyId === farmer.id);
  const manualDebt = sum(
    debtEntries.filter((d) => d.partyKind === 'farmer' && d.partyId === farmer.id).map((d) => d.amount),
  );
  const totalSupplyValue = sum(fs.map((s) => s.total));
  const totalSupplied = sum(fs.map((s) => s.quantity));
  const paidTotal = sum(ps.map((p) => p.amount));
  const lastSupplyDate = fs.length
    ? fs.reduce((m, s) => (s.date > m ? s.date : m), fs[0].date)
    : undefined;
  return {
    ...farmer,
    creditBalance: round(totalSupplyValue - paidTotal + manualDebt),
    totalSupplied: round(totalSupplied),
    totalSupplyValue: round(totalSupplyValue),
    paidTotal: round(paidTotal),
    avgPrice: totalSupplied > 0 ? round(totalSupplyValue / totalSupplied, 3) : farmer.defaultBuyPrice,
    supplyCount: fs.length,
    lastSupplyDate,
  };
}

export function allFarmerStats(data: ErpData): FarmerStats[] {
  return data.farmers.map((f) => computeFarmerStats(f, data.supplies, data.payments, data.debtEntries ?? []));
}

/** إحصاءات فلاح ضمن دورة (فترة) محددة — للتسوية نصف الشهرية. */
export interface FarmerSessionStats {
  farmerId: string;
  sessionId: string;
  fullName: string;
  code: string;
  suppliedQty: number;
  sampleQty: number;
  billableQty: number;
  suppliedValue: number;
  paidAmount: number;
  balance: number;
  status: 'pending' | 'partial' | 'paid' | 'none';
  supplyCount: number;
  paymentCount: number;
}

export function computeFarmerSessionStats(
  farmer: Farmer,
  sessionId: string,
  supplies: SupplyTransaction[],
  payments: Payment[],
): FarmerSessionStats {
  const fs = supplies.filter((s) => s.farmerId === farmer.id && s.sessionId === sessionId);
  const ps = payments.filter(
    (p) => p.kind === 'farmer_payment' && p.partyId === farmer.id && p.sessionId === sessionId,
  );
  const suppliedQty = sum(fs.map((s) => s.quantity));
  const sampleQty = sum(fs.map((s) => s.sampleQty ?? 0));
  const billableQty = round(suppliedQty - sampleQty);
  const suppliedValue = sum(fs.map((s) => s.total));
  const paidAmount = sum(ps.map((p) => p.amount));
  const balance = round(Math.max(0, suppliedValue - paidAmount));

  let status: FarmerSessionStats['status'] = 'none';
  if (suppliedValue > 0.01) {
    if (balance <= 0.01 || ps.some((p) => p.settlementComplete)) status = 'paid';
    else if (paidAmount > 0.01) status = 'partial';
    else status = 'pending';
  }

  return {
    farmerId: farmer.id,
    sessionId,
    fullName: farmer.fullName,
    code: farmer.code,
    suppliedQty: round(suppliedQty),
    sampleQty: round(sampleQty),
    billableQty,
    suppliedValue: round(suppliedValue),
    paidAmount: round(paidAmount),
    balance,
    status,
    supplyCount: fs.length,
    paymentCount: ps.length,
  };
}

export function allFarmerSessionStats(data: ErpData, sessionId: string): FarmerSessionStats[] {
  return data.farmers
    .map((f) => computeFarmerSessionStats(f, sessionId, data.supplies, data.payments))
    .filter((s) => s.supplyCount > 0 || s.paymentCount > 0)
    .sort((a, b) => b.balance - a.balance);
}

// ============================================================
// العملاء + أعمار الديون
// ============================================================
export function computeAging(sales: SaleTransaction[], received: number, asOf = new Date()): AgingBuckets {
  const sorted = [...sales].sort((a, b) => a.date.localeCompare(b.date));
  let remaining = received;
  const buckets: AgingBuckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
  for (const s of sorted) {
    let owed = s.total;
    if (remaining > 0) {
      const applied = Math.min(remaining, owed);
      owed -= applied;
      remaining -= applied;
    }
    if (owed <= 0.01) continue;
    const daysPast = Math.floor((asOf.getTime() - new Date(s.dueDate).getTime()) / 86_400_000);
    if (daysPast <= 0) buckets.current += owed;
    else if (daysPast <= 30) buckets.d1_30 += owed;
    else if (daysPast <= 60) buckets.d31_60 += owed;
    else if (daysPast <= 90) buckets.d61_90 += owed;
    else buckets.d90_plus += owed;
  }
  return {
    current: round(buckets.current),
    d1_30: round(buckets.d1_30),
    d31_60: round(buckets.d31_60),
    d61_90: round(buckets.d61_90),
    d90_plus: round(buckets.d90_plus),
  };
}

export function computeCustomerStats(
  customer: Customer,
  sales: SaleTransaction[],
  payments: Payment[],
  debtEntries: DebtEntry[] = [],
): CustomerStats {
  const cs = sales.filter((s) => s.customerId === customer.id);
  const ps = payments.filter((p) => p.kind === 'customer_payment' && p.partyId === customer.id);
  const manualDebt = sum(
    debtEntries.filter((d) => d.partyKind === 'customer' && d.partyId === customer.id).map((d) => d.amount),
  );
  const totalRevenue = sum(cs.map((s) => s.total));
  const totalPurchased = sum(cs.map((s) => s.quantity));
  const receivedTotal = sum(ps.map((p) => p.amount));
  const outstanding = round(totalRevenue - receivedTotal + manualDebt);
  const aging = computeAging(cs, receivedTotal);
  const overdueAmount = round(aging.d1_30 + aging.d31_60 + aging.d61_90 + aging.d90_plus);
  const lastSaleDate = cs.length
    ? cs.reduce((m, s) => (s.date > m ? s.date : m), cs[0].date)
    : undefined;
  return {
    ...customer,
    outstanding,
    totalPurchased: round(totalPurchased),
    totalRevenue: round(totalRevenue),
    receivedTotal: round(receivedTotal),
    avgPrice: totalPurchased > 0 ? round(totalRevenue / totalPurchased, 3) : customer.defaultSellPrice,
    saleCount: cs.length,
    overdueAmount,
    creditUtilization: customer.creditLimit > 0 ? round((outstanding / customer.creditLimit) * 100) : 0,
    lastSaleDate,
  };
}

export function allCustomerStats(data: ErpData): CustomerStats[] {
  return data.customers.map((c) => computeCustomerStats(c, data.sales, data.payments, data.debtEntries ?? []));
}

// ============================================================
// الموظفون — سلف ورواتب
// ============================================================
export function computeEmployeeAdvanceBalance(
  employeeId: string,
  payments: Payment[],
  payrollBatches: PayrollBatch[],
  debtEntries: DebtEntry[] = [],
): number {
  const advanced = sum(
    payments.filter((p) => p.kind === 'employee_advance' && p.partyId === employeeId).map((p) => p.amount),
  );
  const manualDebt = sum(
    debtEntries.filter((d) => d.partyKind === 'employee' && d.partyId === employeeId).map((d) => d.amount),
  );
  const recovered = sum(
    payrollBatches
      .flatMap((b) => b.lines)
      .filter((l) => l.employeeId === employeeId)
      .map((l) => l.advanceDeducted),
  );
  return round(Math.max(0, advanced - recovered + manualDebt));
}

export function computeEmployeeStats(
  employee: Employee,
  payments: Payment[],
  payrollBatches: PayrollBatch[],
  debtEntries: DebtEntry[] = [],
): EmployeeStats {
  const grossSalary = round(
    employee.baseSalary + employee.allowances.housing + employee.allowances.transport + employee.allowances.food,
  );
  const advancesTotal = round(
    sum(payments.filter((p) => p.kind === 'employee_advance' && p.partyId === employee.id).map((p) => p.amount)),
  );
  const advancesRecovered = round(
    sum(
      payrollBatches
        .flatMap((b) => b.lines)
        .filter((l) => l.employeeId === employee.id)
        .map((l) => l.advanceDeducted),
    ),
  );
  const advanceBalance = computeEmployeeAdvanceBalance(employee.id, payments, payrollBatches, debtEntries);
  const paidBatches = payrollBatches.filter((b) => b.status === 'paid');
  const paidLines = paidBatches.flatMap((b) => b.lines).filter((l) => l.employeeId === employee.id);
  const ytdPaid = round(sum(paidLines.map((l) => l.netSalary)));
  const lastPayrollDate = paidBatches
    .filter((b) => b.lines.some((l) => l.employeeId === employee.id))
    .sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''))[0]?.paidAt;
  return {
    ...employee,
    grossSalary,
    advanceBalance,
    advancesTotal,
    advancesRecovered,
    ytdPaid,
    lastPayrollDate,
    payrollCount: paidLines.length,
  };
}

export function allEmployeeStats(data: ErpData): EmployeeStats[] {
  return data.employees.map((e) => computeEmployeeStats(e, data.payments, data.payrollBatches, data.debtEntries ?? []));
}

export function buildDebtSummary(
  farmers: FarmerStats[],
  customers: CustomerStats[],
  employees: EmployeeStats[],
): DebtSummary {
  const farmerPayables = round(sum(farmers.map((f) => Math.max(0, f.creditBalance))));
  const customerReceivables = round(sum(customers.map((c) => Math.max(0, c.outstanding))));
  const employeeAdvances = round(sum(employees.map((e) => Math.max(0, e.advanceBalance))));

  const rows: DebtLedgerRow[] = [
    ...farmers
      .filter((f) => f.creditBalance > 0.01)
      .map((f) => ({
        id: f.id,
        kind: 'farmer' as const,
        code: f.code,
        name: f.fullName,
        subtitle: f.region,
        balance: f.creditBalance,
        direction: 'payable' as const,
        statusLabel: f.status,
        phone: f.phone,
      })),
    ...customers
      .filter((c) => c.outstanding > 0.01)
      .map((c) => ({
        id: c.id,
        kind: 'customer' as const,
        code: c.code,
        name: c.entityName,
        subtitle: c.entityType,
        balance: c.outstanding,
        direction: 'receivable' as const,
        statusLabel: c.onHold ? 'on_hold' : 'active',
        phone: c.phone,
      })),
    ...employees
      .filter((e) => e.advanceBalance > 0.01)
      .map((e) => ({
        id: e.id,
        kind: 'employee' as const,
        code: e.code,
        name: e.fullName,
        subtitle: e.jobTitle,
        balance: e.advanceBalance,
        direction: 'receivable' as const,
        statusLabel: e.status,
        phone: e.phone,
      })),
  ].sort((a, b) => b.balance - a.balance);

  const totalPayables = farmerPayables;
  const totalReceivables = round(customerReceivables + employeeAdvances);

  return {
    farmerPayables,
    customerReceivables,
    employeeAdvances,
    totalPayables,
    totalReceivables,
    netPosition: round(totalReceivables - totalPayables),
    rows,
  };
}

// ============================================================
// القيود المحاسبية الكاملة
// ============================================================
export function buildAllJournals(data: ErpData, saleCogs: Record<string, number>): JournalEntry[] {
  const entries: JournalEntry[] = [];
  for (const s of data.supplies) entries.push(journalForSupply(s));
  for (const s of data.sales) entries.push(journalForSale(s, saleCogs[s.id] ?? 0));
  for (const p of data.payments) {
    const je = journalForPayment(p);
    if (je) entries.push(je);
  }
  for (const e of data.expenses) {
    if (e.status === 'approved') entries.push(journalForExpense(e));
  }
  for (const b of data.payrollBatches) {
    if (b.status === 'paid') entries.push(journalForPayroll(b));
  }
  for (const a of data.adjustments) entries.push(journalForAdjustment(a));
  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================================
// ملخّص فترة
// ============================================================
export interface SessionSummary {
  session: Session;
  supplyQty: number;
  supplyCost: number;
  supplyCount: number;
  salesQty: number;
  salesRevenue: number;
  salesCount: number;
  cogs: number;
  grossProfit: number;
  marginPct: number;
  farmerPayments: number;
  customerReceipts: number;
  openingStock: number;
  closingStock: number;
}

export function computeSessionSummary(
  session: Session,
  data: ErpData,
  inv: InventoryResult,
): SessionSummary {
  const sup = data.supplies.filter((s) => s.sessionId === session.id);
  const sal = data.sales.filter((s) => s.sessionId === session.id);
  const supplyQty = sum(sup.map((s) => s.quantity));
  const supplyCost = sum(sup.map((s) => s.total));
  const salesQty = sum(sal.map((s) => s.quantity));
  const salesRevenue = sum(sal.map((s) => s.total));
  const cogs = sum(sal.map((s) => inv.saleCogs[s.id] ?? 0));
  const pnl = computePnL(salesRevenue, cogs);
  const farmerPayments = sum(
    data.payments.filter((p) => p.kind === 'farmer_payment' && p.sessionId === session.id).map((p) => p.amount),
  );
  const customerReceipts = sum(
    data.payments.filter((p) => p.kind === 'customer_payment' && p.sessionId === session.id).map((p) => p.amount),
  );
  const adjQty = sum(data.adjustments.filter((a) => a.sessionId === session.id).map((a) => a.quantity));
  const closingStock = round(Math.max(0, session.openingStock + supplyQty - salesQty + adjQty));
  return {
    session,
    supplyQty: round(supplyQty),
    supplyCost: round(supplyCost),
    supplyCount: sup.length,
    salesQty: round(salesQty),
    salesRevenue: round(salesRevenue),
    salesCount: sal.length,
    cogs: round(cogs),
    grossProfit: pnl.grossProfit,
    marginPct: pnl.marginPct,
    farmerPayments: round(farmerPayments),
    customerReceipts: round(customerReceipts),
    openingStock: round(session.openingStock),
    closingStock,
  };
}

// ============================================================
// الحركة اليومية للمخزون
// ============================================================
export interface DailyFlowPoint {
  date: string;
  inQty: number;
  outQty: number;
  balance: number;
}

export function computeDailyFlow(sessionId: string, inv: InventoryResult): DailyFlowPoint[] {
  const byDay = new Map<string, { in: number; out: number; balance: number }>();
  for (const e of inv.entries) {
    if (sessionId !== 'all' && e.sessionId !== sessionId) continue;
    const day = e.date.slice(0, 10);
    const cur = byDay.get(day) ?? { in: 0, out: 0, balance: 0 };
    cur.in += e.quantityIn;
    cur.out += e.quantityOut;
    cur.balance = e.balanceAfter;
    byDay.set(day, cur);
  }
  return Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, inQty: round(v.in), outQty: round(v.out), balance: round(v.balance) }));
}

// ============================================================
// الحزمة الكاملة المشتقّة
// ============================================================
export interface DerivedData {
  inv: InventoryResult;
  journals: JournalEntry[];
  trialBalance: ReturnType<typeof buildTrialBalance>;
  farmers: FarmerStats[];
  customers: CustomerStats[];
  employees: EmployeeStats[];
  debts: DebtSummary;
  activeSession: Session;
  activeSummary: SessionSummary;
  sessionSummaries: SessionSummary[];
  totals: {
    currentStock: number;
    inventoryValue: number;
    wac: number;
    payables: number;
    receivables: number;
    employeeAdvances: number;
    overdue: number;
    netCash: number;
  };
  alerts: SystemAlert[];
}

export function computeDerived(data: ErpData): DerivedData {
  const inv = buildInventoryLedger(data.supplies, data.sales, data.adjustments, data.sessions);
  const journals = buildAllJournals(data, inv.saleCogs);
  const trialBalance = buildTrialBalance(journals);
  const farmers = allFarmerStats(data);
  const customers = allCustomerStats(data);
  const employees = allEmployeeStats(data);
  const debts = buildDebtSummary(farmers, customers, employees);
  const activeSession =
    data.sessions.find((s) => s.id === data.activeSessionId) ?? data.sessions[data.sessions.length - 1];
  const sessionSummaries = data.sessions.map((s) => computeSessionSummary(s, data, inv));
  const activeSummary =
    sessionSummaries.find((s) => s.session.id === activeSession?.id) ?? sessionSummaries[0];

  const payables = debts.totalPayables;
  const receivables = debts.totalReceivables;
  const overdue = round(sum(customers.map((c) => c.overdueAmount)));
  const treasury = computeTreasury(data.vaults, data.banks, data.cashMovements);

  const alerts = buildAlerts({ inv, customers, farmers, data });

  return {
    inv,
    journals,
    trialBalance,
    farmers,
    customers,
    employees,
    debts,
    activeSession,
    activeSummary,
    sessionSummaries,
    totals: {
      currentStock: inv.currentStock,
      inventoryValue: inv.currentValue,
      wac: round(inv.currentWac, 3),
      payables,
      receivables,
      employeeAdvances: debts.employeeAdvances,
      overdue,
      netCash: treasury.total,
    },
    alerts,
  };
}

function buildAlerts(ctx: {
  inv: InventoryResult;
  customers: CustomerStats[];
  farmers: FarmerStats[];
  data: ErpData;
}): SystemAlert[] {
  const alerts: SystemAlert[] = [];
  const overdueCustomers = ctx.customers.filter((c) => c.overdueAmount > 0);
  if (overdueCustomers.length) {
    alerts.push({
      id: 'overdue',
      level: 'warning',
      title: 'مستحقات متأخرة',
      detail: `${overdueCustomers.length} عميل لديه مبالغ متأخرة عن السداد.`,
      href: '/reports',
    });
  }
  const overLimit = ctx.customers.filter((c) => c.creditLimit > 0 && c.outstanding > c.creditLimit);
  if (overLimit.length) {
    alerts.push({
      id: 'credit-limit',
      level: 'warning',
      title: 'تجاوز حد الائتمان',
      detail: `${overLimit.length} عميل تجاوز حدّ الائتمان الممنوح له.`,
      href: '/customers',
    });
  }
  const onHold = ctx.data.customers.filter((c) => c.onHold);
  if (onHold.length) {
    alerts.push({
      id: 'on-hold',
      level: 'info',
      title: 'حسابات مجمّدة',
      detail: `${onHold.length} حساب عميل مجمّد حالياً.`,
      href: '/customers',
    });
  }
  return alerts;
}
