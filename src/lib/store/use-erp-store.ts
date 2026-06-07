'use client';

import { create } from 'zustand';
import { buildInventoryLedger, round } from '@/lib/domain/inventory';
import { computeSessionSummary, computeFarmerStats, computeCustomerStats, computeFarmerSessionStats } from '@/lib/domain/calculations';
import { accountBalance } from '@/lib/domain/treasury';
import { cycleForDate } from '@/lib/domain/cycle';
import type {
  AccountSourceType,
  AppSettings,
  AuditAction,
  AuditLog,
  AuthUser,
  BankAccount,
  CashMovement,
  CashTransfer,
  CashVault,
  Customer,
  Employee,
  Expense,
  ExpenseCategory,
  Farmer,
  InventoryAdjustment,
  Payment,
  PayrollBatch,
  PayrollLine,
  SaleTransaction,
  Session,
  SupplyTransaction,
} from '@/lib/domain/types';
import { uid } from '@/lib/utils';
import { generateSeed } from './seed';
import { generateSeedV3, DEFAULT_EXPENSE_CATEGORIES, emptyV3 } from './seed-v3';

const DEFAULT_SETTINGS: AppSettings = {
  minStockThreshold: 5000,
  defaultBuyPrice: 1.85,
  defaultSellPrice: 2.55,
  currencyLabel: 'د.ل',
};

const DEFAULT_USER: AuthUser = {
  name: 'مدير النظام',
  role: 'admin',
  email: 'admin@alturki.ly',
};

export interface MutationResult {
  ok: boolean;
  error?: string;
  id?: string;
}

interface ErpState {
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  auth: AuthUser | null;

  sessions: Session[];
  activeSessionId: string;
  farmers: Farmer[];
  customers: Customer[];
  supplies: SupplyTransaction[];
  sales: SaleTransaction[];
  payments: Payment[];
  adjustments: InventoryAdjustment[];
  settings: AppSettings;

  // v3.0
  vaults: CashVault[];
  banks: BankAccount[];
  cashMovements: CashMovement[];
  transfers: CashTransfer[];
  expenseCategories: ExpenseCategory[];
  expenses: Expense[];
  employees: Employee[];
  payrollBatches: PayrollBatch[];
  auditLogs: AuditLog[];

  // auth
  login: (user?: Partial<AuthUser>) => void;
  logout: () => void;

  // sessions
  setActiveSession: (id: string) => void;
  closeActiveSession: () => MutationResult;

  // entities
  addFarmer: (input: Omit<Farmer, 'id' | 'code' | 'createdAt'>) => MutationResult;
  updateFarmer: (id: string, patch: Partial<Farmer>) => void;
  addCustomer: (input: Omit<Customer, 'id' | 'code' | 'createdAt'>) => MutationResult;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;

  // transactions
  recordSupply: (input: {
    farmerId: string;
    quantity: number;
    unitPrice: number;
    qualityTier: SupplyTransaction['qualityTier'];
    date?: string;
    fatPct?: number;
    sampleQty?: number;
    notes?: string;
    /** دفع فوري كاش/تحويل عند الاستلام — يُخصم من الخزينة ويُسجّل دفعة للفلاح */
    immediatePayment?: {
      amount: number;
      method: Payment['method'];
      sourceType: AccountSourceType;
      sourceId: string;
      reference?: string;
      settlementComplete?: boolean;
    };
  }) => MutationResult;
  recordSale: (input: {
    customerId: string;
    quantity: number;
    unitPrice: number;
    date?: string;
    dueDate?: string;
    notes?: string;
  }) => MutationResult;
  recordFarmerPayment: (input: {
    farmerId: string;
    amount: number;
    method: Payment['method'];
    date?: string;
    reference?: string;
    notes?: string;
    sourceType?: AccountSourceType;
    sourceId?: string;
    settlementComplete?: boolean;
  }) => MutationResult;
  recordCustomerPayment: (input: {
    customerId: string;
    amount: number;
    method: Payment['method'];
    date?: string;
    reference?: string;
    notes?: string;
    sourceType?: AccountSourceType;
    sourceId?: string;
  }) => MutationResult;
  addAdjustment: (input: { quantity: number; unitCost: number; reason: string; date?: string }) => MutationResult;

  // v3.0 — الخزن والبنوك
  addVault: (input: Omit<CashVault, 'id' | 'code' | 'createdAt'>) => MutationResult;
  updateVault: (id: string, patch: Partial<CashVault>) => void;
  addBank: (input: Omit<BankAccount, 'id' | 'code' | 'createdAt'>) => MutationResult;
  updateBank: (id: string, patch: Partial<BankAccount>) => void;
  recordTransfer: (input: {
    fromType: AccountSourceType;
    fromId: string;
    toType: AccountSourceType;
    toId: string;
    amount: number;
    date?: string;
    referenceDoc?: string;
    notes?: string;
  }) => MutationResult;

  // v3.0 — المصاريف
  recordExpense: (input: {
    categoryId: string;
    amount: number;
    description: string;
    paidFromType: AccountSourceType;
    paidFromId: string;
    date?: string;
    invoiceRef?: string;
  }) => MutationResult;

  // v3.0 — الموظفون والرواتب
  addEmployee: (input: Omit<Employee, 'id' | 'code' | 'createdAt'>) => MutationResult;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  createPayrollBatch: (input: {
    label: string;
    payrollType: PayrollBatch['payrollType'];
    periodFrom: string;
    periodTo: string;
  }) => MutationResult;
  payPayrollBatch: (batchId: string, source: { type: AccountSourceType; id: string }) => MutationResult;

  // settings & demo
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetDemo: () => void;
  clearData: () => void;
  setRole: (role: AuthUser['role']) => void;

  /** استبدال الحالة بلقطة قادمة من السحابة (Supabase). يضبط فقط الحقول المُمرّرة. */
  replaceAll: (data: Partial<{
    sessions: Session[];
    activeSessionId: string | null;
    farmers: Farmer[];
    customers: Customer[];
    supplies: SupplyTransaction[];
    sales: SaleTransaction[];
    payments: Payment[];
    adjustments: InventoryAdjustment[];
    settings: Partial<AppSettings>;
    vaults: CashVault[];
    banks: BankAccount[];
    cashMovements: CashMovement[];
    transfers: CashTransfer[];
    expenseCategories: ExpenseCategory[];
    expenses: Expense[];
    employees: Employee[];
    payrollBatches: PayrollBatch[];
    auditLogs: AuditLog[];
  }>) => void;
}

/** صياغة تاريخ محلي YYYY-MM-DD بدون انزياح المنطقة الزمنية. */
function fmtLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function cycleSessionId(year: number, month0: number, cycleNumber: 1 | 2): string {
  return `cycle-${year}-${String(month0 + 1).padStart(2, '0')}-${cycleNumber}`;
}

/** ينشئ دورة نصف شهرية فارغة (الدورة التي يقع فيها التاريخ المُمرّر). */
function freshSession(ref: Date = new Date()): Session {
  const w = cycleForDate(ref);
  return {
    id: cycleSessionId(w.year, w.month, w.cycleNumber),
    label: w.label,
    periodFrom: fmtLocalDate(w.from),
    periodTo: fmtLocalDate(w.to),
    status: 'open',
    cycleNumber: w.cycleNumber,
    openingStock: 0,
    openingAvgCost: 0,
    openingPayables: 0,
    openingReceivables: 0,
    createdAt: new Date().toISOString(),
  };
}

function nextRef(prefix: string, existing: { ref: string }[], year = 2026): string {
  const max = existing
    .map((e) => {
      const m = e.ref.match(/(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}-${year}-${String(max + 1).padStart(4, '0')}`;
}

function currentStockOf(state: ErpState): number {
  return buildInventoryLedger(state.supplies, state.sales, state.adjustments, state.sessions).currentStock;
}

function requireOpenSession(state: ErpState): MutationResult & { session?: Session } {
  const session = state.sessions.find((s) => s.id === state.activeSessionId);
  if (!session) return { ok: false, error: 'لا توجد دورة نشطة.' };
  if (session.status === 'archived') return { ok: false, error: 'الدورة مؤرشفة — لا يمكن تسجيل عمليات جديدة.' };
  return { ok: true, session };
}

function makeAudit(
  state: { auth: AuthUser | null },
  entityType: string,
  entityId: string,
  action: AuditAction,
  summary: string,
  reason?: string,
): AuditLog {
  return {
    id: uid('au-'),
    entityType,
    entityId,
    action,
    summary,
    performedBy: state.auth?.name ?? 'النظام',
    performedByRole: state.auth?.role ?? 'viewer',
    performedAt: new Date().toISOString(),
    reason,
  };
}

const INITIAL_SESSION = freshSession();

export const useErpStore = create<ErpState>()((set, get) => ({
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),
      auth: null,

      // النظام يبدأ فارغاً تماماً — لا بيانات تجريبية افتراضية
      sessions: [INITIAL_SESSION],
      activeSessionId: INITIAL_SESSION.id,
      farmers: [],
      customers: [],
      supplies: [],
      sales: [],
      payments: [],
      adjustments: [],
      settings: DEFAULT_SETTINGS,

      vaults: [],
      banks: [],
      cashMovements: [],
      transfers: [],
      expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
      expenses: [],
      employees: [],
      payrollBatches: [],
      auditLogs: [],

      login: (user) => set({ auth: { ...DEFAULT_USER, ...user } }),
      logout: () => set({ auth: null }),

      setActiveSession: (id) => set({ activeSessionId: id }),

      closeActiveSession: () => {
        const state = get();
        const active = state.sessions.find((s) => s.id === state.activeSessionId);
        if (!active) return { ok: false, error: 'لا توجد فترة نشطة.' };
        if (active.status === 'archived') return { ok: false, error: 'الفترة مؤرشفة بالفعل.' };

        const inv = buildInventoryLedger(state.supplies, state.sales, state.adjustments, state.sessions);
        const summary = computeSessionSummary(active, state as any, inv);

        const farmerStats = state.farmers.map((f) => computeFarmerStats(f, state.supplies, state.payments));
        const sessionFarmerStats = state.farmers.map((f) =>
          computeFarmerSessionStats(f, active.id, state.supplies, state.payments),
        );
        const customerStats = state.customers.map((c) =>
          computeCustomerStats(c, state.sales, state.payments),
        );
        const payables = round(farmerStats.reduce((s, f) => s + Math.max(0, f.creditBalance), 0));
        const receivables = round(customerStats.reduce((s, c) => s + Math.max(0, c.outstanding), 0));

        const archived: Session = {
          ...active,
          status: 'archived',
          closedAt: new Date().toISOString(),
          archive: {
            summary: {
              supply: { transactions: summary.supplyCount, qty: summary.supplyQty, cost: summary.supplyCost },
              sales: {
                transactions: summary.salesCount,
                qty: summary.salesQty,
                revenue: summary.salesRevenue,
                cogs: summary.cogs,
              },
              profit: { gross: summary.grossProfit, marginPct: summary.marginPct },
              inventory: {
                opening: summary.openingStock,
                closing: summary.closingStock,
                variance: round(summary.closingStock - summary.openingStock),
              },
              cash: { farmerPayments: summary.farmerPayments, customerReceipts: summary.customerReceipts },
            },
            balancesSnapshot: {
              farmers: sessionFarmerStats
                .filter((f) => f.supplyCount > 0 || f.paymentCount > 0)
                .map((f) => ({
                  id: f.farmerId,
                  name: f.fullName,
                  balance: f.balance,
                  suppliedQty: f.suppliedQty,
                  paidAmount: f.paidAmount,
                  status: f.status === 'none' ? 'pending' : f.status,
                })),
              customers: customerStats
                .filter((c) => Math.abs(c.outstanding) > 0.01)
                .map((c) => ({ id: c.id, name: c.entityName, balance: c.outstanding })),
            },
            carryForward: {
              openingStock: round(inv.currentStock),
              payables,
              receivables,
            },
          },
        };

        // الدورة التالية: اليوم التالي لنهاية الدورة الحالية يقع ضمن الدورة نصف الشهرية التالية
        const dayAfter = new Date(active.periodTo + 'T00:00:00');
        dayAfter.setDate(dayAfter.getDate() + 1);
        const w = cycleForDate(dayAfter);
        const newId = cycleSessionId(w.year, w.month, w.cycleNumber);
        const carriedStock = round(inv.currentStock);
        const next: Session = {
          id: newId,
          label: w.label,
          periodFrom: fmtLocalDate(w.from),
          periodTo: fmtLocalDate(w.to),
          status: 'open',
          cycleNumber: w.cycleNumber,
          openingStock: carriedStock,
          openingAvgCost: round(inv.currentWac, 3),
          openingPayables: payables,
          openingReceivables: receivables,
          createdAt: new Date().toISOString(),
        };

        const audit = makeAudit(
          state,
          'session',
          active.id,
          'close',
          `إغلاق الدورة «${active.label}» — مبيعات ${round(summary.salesRevenue)} د.ل، ربح ${round(summary.grossProfit)} د.ل، مخزون مرحّل ${carriedStock} لتر`,
        );

        const archivedSessions = state.sessions.map((s) => (s.id === active.id ? archived : s));
        const hasNext = archivedSessions.some((s) => s.id === newId);
        set({
          sessions: hasNext ? archivedSessions : [...archivedSessions, next],
          activeSessionId: newId,
          auditLogs: [audit, ...state.auditLogs],
        });
        return { ok: true, id: newId };
      },

      addFarmer: (input) => {
        const state = get();
        const code = `F-${String(state.farmers.length + 1).padStart(3, '0')}`;
        const farmer: Farmer = { ...input, id: uid('farmer-'), code, createdAt: new Date().toISOString() };
        set({ farmers: [farmer, ...state.farmers] });
        return { ok: true, id: farmer.id };
      },
      updateFarmer: (id, patch) =>
        set((s) => ({ farmers: s.farmers.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),

      addCustomer: (input) => {
        const state = get();
        const code = `C-${String(state.customers.length + 1).padStart(3, '0')}`;
        const customer: Customer = { ...input, id: uid('customer-'), code, createdAt: new Date().toISOString() };
        set({ customers: [customer, ...state.customers] });
        return { ok: true, id: customer.id };
      },
      updateCustomer: (id, patch) =>
        set((s) => ({ customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

      recordSupply: (input) => {
        const state = get();
        const gate = requireOpenSession(state);
        if (!gate.ok) return gate;
        if (input.quantity <= 0) return { ok: false, error: 'الكمية يجب أن تكون أكبر من صفر.' };
        if (input.unitPrice <= 0) return { ok: false, error: 'سعر الشراء يجب أن يكون أكبر من صفر.' };
        const sampleQty = round(Math.max(0, input.sampleQty ?? 0));
        if (sampleQty > input.quantity) return { ok: false, error: 'كمية العينة لا يمكن أن تتجاوز الكمية الكلية.' };

        const farmer = state.farmers.find((f) => f.id === input.farmerId);
        if (!farmer) return { ok: false, error: 'الفلاح غير موجود.' };

        const ip = input.immediatePayment;
        if (ip) {
          if (ip.amount <= 0) return { ok: false, error: 'مبلغ الدفع الفوري غير صالح.' };
          const bal = accountBalance(ip.sourceType, ip.sourceId, state.vaults, state.banks, state.cashMovements);
          if (ip.amount > bal + 0.001)
            return { ok: false, error: `رصيد الحساب (${Math.floor(bal).toLocaleString('en-US')} د.ل) لا يكفي للدفع الفوري.` };
        }

        const date = input.date ?? new Date().toISOString();
        const billableQty = round(input.quantity - sampleQty);
        const total = round(billableQty * input.unitPrice);

        const tx: SupplyTransaction = {
          id: uid('sup-'),
          ref: nextRef('SUP', state.supplies),
          farmerId: input.farmerId,
          sessionId: state.activeSessionId,
          date,
          quantity: round(input.quantity),
          unitPrice: round(input.unitPrice, 3),
          total,
          qualityTier: input.qualityTier,
          sampleQty: sampleQty > 0 ? sampleQty : undefined,
          fatPct: input.fatPct,
          notes: input.notes,
          createdAt: new Date().toISOString(),
          createdBy: state.auth?.name,
        };

        let payments = state.payments;
        let cashMovements = state.cashMovements;

        if (ip) {
          const payId = uid('pay-');
          const payment: Payment = {
            id: payId,
            ref: nextRef('PAY', state.payments.filter((p) => p.kind === 'farmer_payment')),
            kind: 'farmer_payment',
            partyId: input.farmerId,
            sessionId: state.activeSessionId,
            date,
            amount: round(ip.amount),
            method: ip.method,
            paidFromType: ip.sourceType,
            paidFromId: ip.sourceId,
            reference: ip.reference,
            notes: 'دفع فوري عند استلام التوريد',
            settlementComplete: ip.settlementComplete ?? (ip.amount >= total - 0.01),
            createdAt: new Date().toISOString(),
            createdBy: state.auth?.name,
          };
          const movement: CashMovement = {
            id: uid('cm-'),
            ref: nextRef('CM', state.cashMovements),
            movementType: 'farmer_payout',
            sourceType: ip.sourceType,
            sourceId: ip.sourceId,
            amount: round(ip.amount),
            direction: 'out',
            referenceType: 'payment',
            referenceId: payId,
            description: `دفع فوري — توريد ${farmer.fullName}`,
            sessionId: state.activeSessionId,
            date,
            createdAt: new Date().toISOString(),
          };
          payments = [payment, ...payments];
          cashMovements = [movement, ...cashMovements];
        }

        set({ supplies: [tx, ...state.supplies], payments, cashMovements });
        return { ok: true, id: tx.id };
      },

      recordSale: (input) => {
        const state = get();
        const gate = requireOpenSession(state);
        if (!gate.ok) return gate;
        if (input.quantity <= 0) return { ok: false, error: 'الكمية يجب أن تكون أكبر من صفر.' };
        if (input.unitPrice <= 0) return { ok: false, error: 'سعر البيع يجب أن يكون أكبر من صفر.' };
        const customer = state.customers.find((c) => c.id === input.customerId);
        if (!customer) return { ok: false, error: 'العميل غير موجود.' };
        if (customer.onHold) return { ok: false, error: 'حساب العميل مجمّد — لا يمكن البيع له.' };
        // RULE_INV_001 — منع البيع إذا تجاوزت الكمية المخزون المتاح
        const stock = currentStockOf(state);
        if (input.quantity > stock + 0.001) {
          return {
            ok: false,
            error: `الكمية المطلوبة (${input.quantity.toLocaleString('en-US')} لتر) تتجاوز المخزون المتاح (${Math.floor(stock).toLocaleString('en-US')} لتر).`,
          };
        }
        const date = input.date ?? new Date().toISOString();
        const due =
          input.dueDate ??
          new Date(new Date(date).getTime() + customer.paymentTerms * 86_400_000).toISOString();
        const tx: SaleTransaction = {
          id: uid('sal-'),
          ref: nextRef('SAL', state.sales),
          customerId: input.customerId,
          sessionId: state.activeSessionId,
          date,
          quantity: round(input.quantity),
          unitPrice: round(input.unitPrice, 3),
          total: round(input.quantity * input.unitPrice),
          dueDate: due,
          notes: input.notes,
          createdAt: new Date().toISOString(),
          createdBy: state.auth?.name,
        };
        set({ sales: [tx, ...state.sales] });
        return { ok: true, id: tx.id };
      },

      recordFarmerPayment: (input) => {
        const state = get();
        const gate = requireOpenSession(state);
        if (!gate.ok) return gate;
        if (input.amount <= 0) return { ok: false, error: 'المبلغ يجب أن يكون أكبر من صفر.' };
        const farmer = state.farmers.find((f) => f.id === input.farmerId);
        if (!farmer) return { ok: false, error: 'الفلاح غير موجود.' };
        const amount = round(input.amount);
        const date = input.date ?? new Date().toISOString();
        const useSource = Boolean(input.sourceType && input.sourceId);

        if (useSource) {
          const bal = accountBalance(input.sourceType!, input.sourceId!, state.vaults, state.banks, state.cashMovements);
          if (amount > bal + 0.001)
            return { ok: false, error: `الرصيد المتاح (${Math.floor(bal).toLocaleString('en-US')} د.ل) لا يكفي للدفع.` };
        }

        const tx: Payment = {
          id: uid('pay-'),
          ref: nextRef('PAY', state.payments.filter((p) => p.kind === 'farmer_payment')),
          kind: 'farmer_payment',
          partyId: input.farmerId,
          sessionId: state.activeSessionId,
          date,
          amount,
          method: input.method,
          paidFromType: useSource ? input.sourceType : undefined,
          paidFromId: useSource ? input.sourceId : undefined,
          reference: input.reference,
          notes: input.notes,
          settlementComplete: input.settlementComplete,
          createdAt: new Date().toISOString(),
          createdBy: state.auth?.name,
        };

        const movement: CashMovement | null = useSource
          ? {
              id: uid('cm-'),
              ref: nextRef('CM', state.cashMovements),
              movementType: 'farmer_payout',
              sourceType: input.sourceType!,
              sourceId: input.sourceId!,
              amount,
              direction: 'out',
              referenceType: 'payment',
              referenceId: tx.id,
              description: `دفعة للفلاح ${farmer?.fullName ?? ''}`.trim(),
              sessionId: state.activeSessionId,
              date,
              createdAt: new Date().toISOString(),
            }
          : null;

        set({
          payments: [tx, ...state.payments],
          cashMovements: movement ? [movement, ...state.cashMovements] : state.cashMovements,
          auditLogs: [
            makeAudit(state, 'payment', tx.id, 'pay', `دفعة للفلاح ${farmer?.fullName ?? ''}: ${amount.toLocaleString('en-US')} د.ل`),
            ...state.auditLogs,
          ],
        });
        return { ok: true, id: tx.id };
      },

      recordCustomerPayment: (input) => {
        const state = get();
        const gate = requireOpenSession(state);
        if (!gate.ok) return gate;
        if (input.amount <= 0) return { ok: false, error: 'المبلغ يجب أن يكون أكبر من صفر.' };
        const customer = state.customers.find((c) => c.id === input.customerId);
        if (!customer) return { ok: false, error: 'العميل غير موجود.' };
        const amount = round(input.amount);
        const date = input.date ?? new Date().toISOString();
        const useSource = Boolean(input.sourceType && input.sourceId);

        const tx: Payment = {
          id: uid('pay-'),
          ref: nextRef('RCV', state.payments.filter((p) => p.kind === 'customer_payment')),
          kind: 'customer_payment',
          partyId: input.customerId,
          sessionId: state.activeSessionId,
          date,
          amount,
          method: input.method,
          paidFromType: useSource ? input.sourceType : undefined,
          paidFromId: useSource ? input.sourceId : undefined,
          reference: input.reference,
          notes: input.notes,
          createdAt: new Date().toISOString(),
          createdBy: state.auth?.name,
        };

        const movement: CashMovement | null = useSource
          ? {
              id: uid('cm-'),
              ref: nextRef('CM', state.cashMovements),
              movementType: 'sale_payment',
              sourceType: input.sourceType!,
              sourceId: input.sourceId!,
              amount,
              direction: 'in',
              referenceType: 'payment',
              referenceId: tx.id,
              description: `تحصيل من العميل ${customer?.entityName ?? ''}`.trim(),
              sessionId: state.activeSessionId,
              date,
              createdAt: new Date().toISOString(),
            }
          : null;

        set({
          payments: [tx, ...state.payments],
          cashMovements: movement ? [movement, ...state.cashMovements] : state.cashMovements,
          auditLogs: [
            makeAudit(state, 'payment', tx.id, 'pay', `تحصيل من العميل ${customer?.entityName ?? ''}: ${amount.toLocaleString('en-US')} د.ل`),
            ...state.auditLogs,
          ],
        });
        return { ok: true, id: tx.id };
      },

      addAdjustment: (input) => {
        const state = get();
        const gate = requireOpenSession(state);
        if (!gate.ok) return gate;
        if (input.quantity === 0) return { ok: false, error: 'حدّد كمية التسوية.' };
        const tx: InventoryAdjustment = {
          id: uid('adj-'),
          ref: nextRef('ADJ', state.adjustments),
          sessionId: state.activeSessionId,
          date: input.date ?? new Date().toISOString(),
          quantity: round(input.quantity),
          unitCost: round(input.unitCost, 3),
          reason: input.reason,
          createdAt: new Date().toISOString(),
        };
        set({ adjustments: [tx, ...state.adjustments] });
        return { ok: true, id: tx.id };
      },

      // ── v3.0: الخزن والبنوك ──────────────────────────────
      addVault: (input) => {
        const state = get();
        const code = `V-${String(state.vaults.length + 1).padStart(2, '0')}`;
        const vault: CashVault = { ...input, id: uid('vault-'), code, createdAt: new Date().toISOString() };
        set({
          vaults: [vault, ...state.vaults],
          auditLogs: [makeAudit(state, 'vault', vault.id, 'create', `إنشاء خزنة: ${vault.name}`), ...state.auditLogs],
        });
        return { ok: true, id: vault.id };
      },
      updateVault: (id, patch) =>
        set((s) => ({
          vaults: s.vaults.map((v) => (v.id === id ? { ...v, ...patch } : v)),
          auditLogs: [makeAudit(s, 'vault', id, 'update', 'تعديل بيانات خزنة'), ...s.auditLogs],
        })),

      addBank: (input) => {
        const state = get();
        const code = `B-${String(state.banks.length + 1).padStart(2, '0')}`;
        const bank: BankAccount = { ...input, id: uid('bank-'), code, createdAt: new Date().toISOString() };
        set({
          banks: [bank, ...state.banks],
          auditLogs: [makeAudit(state, 'bank', bank.id, 'create', `إنشاء حساب بنكي: ${bank.bankName}`), ...state.auditLogs],
        });
        return { ok: true, id: bank.id };
      },
      updateBank: (id, patch) =>
        set((s) => ({
          banks: s.banks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
          auditLogs: [makeAudit(s, 'bank', id, 'update', 'تعديل بيانات بنك'), ...s.auditLogs],
        })),

      recordTransfer: (input) => {
        const state = get();
        const gate = requireOpenSession(state);
        if (!gate.ok) return gate;
        if (input.amount <= 0) return { ok: false, error: 'المبلغ يجب أن يكون أكبر من صفر.' };
        if (input.fromType === input.toType && input.fromId === input.toId)
          return { ok: false, error: 'لا يمكن التحويل إلى نفس الحساب.' };
        const bal = accountBalance(input.fromType, input.fromId, state.vaults, state.banks, state.cashMovements);
        if (input.amount > bal + 0.001)
          return { ok: false, error: `الرصيد المتاح (${Math.floor(bal).toLocaleString('en-US')} د.ل) لا يكفي للتحويل.` };
        const date = input.date ?? new Date().toISOString();
        const id = uid('tr-');
        const amount = round(input.amount);
        const transfer: CashTransfer = {
          id,
          ref: nextRef('TR', state.transfers),
          fromType: input.fromType,
          fromId: input.fromId,
          toType: input.toType,
          toId: input.toId,
          amount,
          date,
          referenceDoc: input.referenceDoc,
          notes: input.notes,
          sessionId: state.activeSessionId,
          createdAt: new Date().toISOString(),
        };
        const out: CashMovement = {
          id: uid('cm-'),
          ref: nextRef('CM', state.cashMovements),
          movementType: 'transfer_out',
          sourceType: input.fromType,
          sourceId: input.fromId,
          amount,
          direction: 'out',
          referenceType: 'transfer',
          referenceId: id,
          description: 'تحويل صادر بين الحسابات',
          sessionId: state.activeSessionId,
          date,
          createdAt: new Date().toISOString(),
        };
        const inn: CashMovement = {
          id: uid('cm-'),
          ref: nextRef('CM', [out, ...state.cashMovements]),
          movementType: 'transfer_in',
          sourceType: input.toType,
          sourceId: input.toId,
          amount,
          direction: 'in',
          referenceType: 'transfer',
          referenceId: id,
          description: 'تحويل وارد بين الحسابات',
          sessionId: state.activeSessionId,
          date,
          createdAt: new Date().toISOString(),
        };
        set({
          transfers: [transfer, ...state.transfers],
          cashMovements: [inn, out, ...state.cashMovements],
          auditLogs: [makeAudit(state, 'transfer', id, 'transfer', `تحويل ${amount.toLocaleString('en-US')} د.ل بين الحسابات`), ...state.auditLogs],
        });
        return { ok: true, id };
      },

      // ── v3.0: المصاريف ───────────────────────────────────
      recordExpense: (input) => {
        const state = get();
        const gate = requireOpenSession(state);
        if (!gate.ok) return gate;
        if (input.amount <= 0) return { ok: false, error: 'المبلغ يجب أن يكون أكبر من صفر.' };
        const cat = state.expenseCategories.find((c) => c.id === input.categoryId);
        if (!cat) return { ok: false, error: 'التصنيف غير موجود.' };
        const bal = accountBalance(input.paidFromType, input.paidFromId, state.vaults, state.banks, state.cashMovements);
        if (input.amount > bal + 0.001)
          return { ok: false, error: `الرصيد المتاح (${Math.floor(bal).toLocaleString('en-US')} د.ل) لا يكفي لتسجيل المصروف.` };
        const date = input.date ?? new Date().toISOString();
        const id = uid('exp-');
        const amount = round(input.amount);
        const expense: Expense = {
          id,
          ref: nextRef('EXP', state.expenses),
          categoryId: input.categoryId,
          amount,
          description: input.description,
          date,
          paidFromType: input.paidFromType,
          paidFromId: input.paidFromId,
          invoiceRef: input.invoiceRef,
          sessionId: state.activeSessionId,
          status: 'approved',
          recordedBy: state.auth?.name,
          createdAt: new Date().toISOString(),
        };
        const cm: CashMovement = {
          id: uid('cm-'),
          ref: nextRef('CM', state.cashMovements),
          movementType: 'expense',
          sourceType: input.paidFromType,
          sourceId: input.paidFromId,
          amount,
          direction: 'out',
          referenceType: 'expense',
          referenceId: id,
          description: input.description,
          sessionId: state.activeSessionId,
          date,
          createdAt: new Date().toISOString(),
        };
        set({
          expenses: [expense, ...state.expenses],
          cashMovements: [cm, ...state.cashMovements],
          auditLogs: [makeAudit(state, 'expense', id, 'create', `مصروف ${cat.name}: ${amount.toLocaleString('en-US')} د.ل`), ...state.auditLogs],
        });
        return { ok: true, id };
      },

      // ── v3.0: الموظفون والرواتب ──────────────────────────
      addEmployee: (input) => {
        const state = get();
        const code = `E-${String(state.employees.length + 1).padStart(3, '0')}`;
        const emp: Employee = { ...input, id: uid('emp-'), code, createdAt: new Date().toISOString() };
        set({
          employees: [emp, ...state.employees],
          auditLogs: [makeAudit(state, 'employee', emp.id, 'create', `إضافة موظف: ${emp.fullName}`), ...state.auditLogs],
        });
        return { ok: true, id: emp.id };
      },
      updateEmployee: (id, patch) =>
        set((s) => ({
          employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)),
          auditLogs: [makeAudit(s, 'employee', id, 'update', 'تعديل بيانات موظف'), ...s.auditLogs],
        })),

      createPayrollBatch: (input) => {
        const state = get();
        const gate = requireOpenSession(state);
        if (!gate.ok) return gate;
        const active = state.employees.filter((e) => e.status === 'active');
        if (!active.length) return { ok: false, error: 'لا يوجد موظفون نشطون لإنشاء كشف رواتب.' };
        const lines: PayrollLine[] = active.map((e) => {
          const allowancesTotal = e.allowances.housing + e.allowances.transport + e.allowances.food;
          return {
            employeeId: e.id,
            baseSalary: e.baseSalary,
            allowancesTotal,
            deductionsTotal: 0,
            netSalary: round(e.baseSalary + allowancesTotal),
            attendanceDays: 30,
            absenceDays: 0,
            advanceDeducted: 0,
          };
        });
        const totalAmount = round(lines.reduce((s, l) => s + l.netSalary, 0));
        const id = uid('pr-');
        const batch: PayrollBatch = {
          id,
          ref: nextRef('PR', state.payrollBatches),
          label: input.label,
          payrollType: input.payrollType,
          periodFrom: input.periodFrom,
          periodTo: input.periodTo,
          lines,
          totalAmount,
          status: 'draft',
          sessionId: state.activeSessionId,
          createdBy: state.auth?.name,
          createdAt: new Date().toISOString(),
        };
        set({
          payrollBatches: [batch, ...state.payrollBatches],
          auditLogs: [makeAudit(state, 'payroll', id, 'create', `إنشاء كشف رواتب: ${input.label}`), ...state.auditLogs],
        });
        return { ok: true, id };
      },

      payPayrollBatch: (batchId, source) => {
        const state = get();
        const gate = requireOpenSession(state);
        if (!gate.ok) return gate;
        const batch = state.payrollBatches.find((b) => b.id === batchId);
        if (!batch) return { ok: false, error: 'كشف الرواتب غير موجود.' };
        if (batch.status === 'paid') return { ok: false, error: 'الكشف مصروف بالفعل.' };
        const bal = accountBalance(source.type, source.id, state.vaults, state.banks, state.cashMovements);
        if (batch.totalAmount > bal + 0.001)
          return { ok: false, error: `الرصيد المتاح (${Math.floor(bal).toLocaleString('en-US')} د.ل) لا يكفي لصرف الرواتب.` };
        const date = new Date().toISOString();
        const cm: CashMovement = {
          id: uid('cm-'),
          ref: nextRef('CM', state.cashMovements),
          movementType: 'salary',
          sourceType: source.type,
          sourceId: source.id,
          amount: batch.totalAmount,
          direction: 'out',
          referenceType: 'payroll',
          referenceId: batchId,
          description: `صرف ${batch.label}`,
          sessionId: state.activeSessionId,
          date,
          createdAt: date,
        };
        set({
          payrollBatches: state.payrollBatches.map((b) =>
            b.id === batchId ? { ...b, status: 'paid', paidFromType: source.type, paidFromId: source.id, paidAt: date } : b,
          ),
          cashMovements: [cm, ...state.cashMovements],
          auditLogs: [makeAudit(state, 'payroll', batchId, 'pay', `صرف رواتب ${batch.totalAmount.toLocaleString('en-US')} د.ل`), ...state.auditLogs],
        });
        return { ok: true, id: batchId };
      },

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      resetDemo: () => {
        const fresh = generateSeed();
        const freshV3 = generateSeedV3(fresh.activeSessionId);
        set({
          sessions: fresh.sessions,
          activeSessionId: fresh.activeSessionId,
          farmers: fresh.farmers,
          customers: fresh.customers,
          supplies: fresh.supplies,
          sales: fresh.sales,
          payments: fresh.payments,
          adjustments: [],
          settings: DEFAULT_SETTINGS,
          vaults: freshV3.vaults,
          banks: freshV3.banks,
          cashMovements: freshV3.cashMovements,
          transfers: freshV3.transfers,
          expenseCategories: freshV3.expenseCategories,
          expenses: freshV3.expenses,
          employees: freshV3.employees,
          payrollBatches: freshV3.payrollBatches,
          auditLogs: freshV3.auditLogs,
        });
      },

      clearData: () => {
        const session = freshSession();
        const blank = emptyV3();
        set({
          sessions: [session],
          activeSessionId: session.id,
          farmers: [],
          customers: [],
          supplies: [],
          sales: [],
          payments: [],
          adjustments: [],
          vaults: blank.vaults,
          banks: blank.banks,
          cashMovements: blank.cashMovements,
          transfers: blank.transfers,
          expenseCategories: blank.expenseCategories,
          expenses: blank.expenses,
          employees: blank.employees,
          payrollBatches: blank.payrollBatches,
          auditLogs: blank.auditLogs,
        });
      },

      setRole: (role) =>
        set((s) => ({ auth: s.auth ? { ...s.auth, role } : { ...DEFAULT_USER, role } })),

      replaceAll: (data) =>
        set((s) => {
          const next: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(data)) {
            if (v !== undefined && k !== 'settings') next[k] = v;
          }
          if (data.settings) next.settings = { ...s.settings, ...data.settings };
          return next as Partial<ErpState>;
        }),
}));
