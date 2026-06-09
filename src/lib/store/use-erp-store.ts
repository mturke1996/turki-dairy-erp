'use client';

import { create } from 'zustand';
import { buildInventoryLedger, round } from '@/lib/domain/inventory';
import { computeSessionSummary, computeCustomerStats, computeFarmerSessionStats, computeEmployeeAdvanceBalance, buildSessionCarryForwardSnapshot, type ErpData } from '@/lib/domain/calculations';
import { accountBalance } from '@/lib/domain/treasury';
import { cycleForDate, cycleOfMonth } from '@/lib/domain/cycle';
import { defaultDebtDirection, debtRemainingAmount, debtSettlementIsCashOut, isDebtFullySettled } from '@/lib/domain/debt';
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
  DebtDirection,
  Employee,
  Expense,
  ExpenseCategory,
  ExternalIncome,
  Farmer,
  InventoryAdjustment,
  Payment,
  PayrollBatch,
  PayrollLine,
  SaleTransaction,
  Session,
  SupplyTransaction,
  DebtEntry,
  DebtPartyKind,
  ExpenseGroup,
} from '@/lib/domain/types';
import { uid } from '@/lib/utils';
import { formatLiters, formatMoney, formatPricePerLiter } from '@/lib/format-currency';
import { generateSeed } from './seed';
import { generateSeedV3, DEFAULT_EXPENSE_CATEGORIES, emptyV3 } from './seed-v3';
import { isSupabaseConfigured } from '@/lib/supabase/repository';

const DEFAULT_SETTINGS: AppSettings = {
  minStockThreshold: 0,
  defaultBuyPrice: 1.85,
  defaultSellPrice: 2.55,
  currencyLabel: 'د.ل',
};

const DEFAULT_USER: AuthUser = {
  name: 'مدير النظام',
  role: 'admin',
  email: 'admin@alturki.ly',
};

function nextPartyCode(prefix: string, items: { code: string }[]): string {
  const max = items.reduce((m, item) => {
    const n = parseInt(item.code.replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

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
  debtEntries: DebtEntry[];
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
  externalIncomes: ExternalIncome[];

  // auth
  login: (user?: Partial<AuthUser>) => void;
  logout: () => void;

  // sessions
  setActiveSession: (id: string) => Promise<MutationResult>;
  closeActiveSession: () => Promise<MutationResult>;
  createSessionForCycle: (input: { year: number; month: number; cycleNumber: 1 | 2 }) => Promise<MutationResult>;

  // entities
  addFarmer: (
    input: Omit<Farmer, 'id' | 'code' | 'createdAt'> & {
      openingBalance?: { amount: number; direction: DebtDirection };
    },
  ) => Promise<MutationResult>;
  updateFarmer: (id: string, patch: Partial<Farmer>) => Promise<MutationResult>;
  deleteFarmer: (id: string) => Promise<MutationResult>;
  addCustomer: (input: Omit<Customer, 'id' | 'code' | 'createdAt'>) => Promise<MutationResult>;
  updateCustomer: (id: string, patch: Partial<Customer>) => Promise<MutationResult>;
  deleteCustomer: (id: string) => Promise<MutationResult>;
  updateVault: (id: string, patch: Partial<CashVault>) => Promise<MutationResult>;
  updateBank: (id: string, patch: Partial<BankAccount>) => Promise<MutationResult>;

  // transactions
  recordSupply: (input: {
    farmerId: string;
    quantity: number;
    unitPrice: number;
    qualityTier: SupplyTransaction['qualityTier'];
    date?: string;
    fatPct?: number;
    sampleQty?: number;
    milkShift?: SupplyTransaction['milkShift'];
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
  }) => Promise<MutationResult>;
  recordSale: (input: {
    customerId: string;
    quantity: number;
    unitPrice: number;
    date?: string;
    dueDate?: string;
    notes?: string;
  }) => Promise<MutationResult>;
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
  }) => Promise<MutationResult>;
  recordCustomerPayment: (input: {
    customerId: string;
    amount: number;
    method: Payment['method'];
    date?: string;
    reference?: string;
    notes?: string;
    sourceType?: AccountSourceType;
    sourceId?: string;
  }) => Promise<MutationResult>;
  recordEmployeeAdvance: (input: {
    employeeId: string;
    amount: number;
    method: Payment['method'];
    date?: string;
    reference?: string;
    notes?: string;
    sourceType: AccountSourceType;
    sourceId: string;
  }) => Promise<MutationResult>;
  recordDebtEntry: (input: {
    partyKind: DebtPartyKind;
    partyId?: string;
    partyName?: string;
    amount: number;
    direction?: DebtDirection;
    date?: string;
    description?: string;
  }) => Promise<MutationResult>;
  updateDebtEntry: (id: string, patch: Partial<Pick<DebtEntry, 'amount' | 'direction' | 'date' | 'description' | 'partyName'>>) => Promise<MutationResult>;
  deleteDebtEntry: (id: string) => Promise<MutationResult>;
  settleDebtEntry: (id: string, input: {
    amount: number;
    method: Payment['method'];
    date?: string;
    notes?: string;
    sourceType?: AccountSourceType;
    sourceId?: string;
  }) => Promise<MutationResult>;
  addAdjustment: (input: { quantity: number; unitCost: number; reason: string; date?: string }) => Promise<MutationResult>;
  updateSupply: (
    id: string,
    patch: Partial<
      Pick<
        SupplyTransaction,
        'quantity' | 'unitPrice' | 'qualityTier' | 'milkShift' | 'notes' | 'date' | 'sampleQty' | 'fatPct'
      >
    >,
  ) => Promise<MutationResult>;
  updateSale: (
    id: string,
    patch: Partial<Pick<SaleTransaction, 'quantity' | 'unitPrice' | 'notes' | 'date' | 'dueDate'>>,
  ) => Promise<MutationResult>;
  deleteSupply: (id: string) => Promise<MutationResult>;
  deleteSale: (id: string) => Promise<MutationResult>;
  deletePayment: (id: string) => Promise<MutationResult>;
  deleteAdjustment: (id: string) => Promise<MutationResult>;

  // v3.0 — الخزن والبنوك
  addVault: (input: Omit<CashVault, 'id' | 'code' | 'createdAt'>) => Promise<MutationResult>;
  addBank: (input: Omit<BankAccount, 'id' | 'code' | 'createdAt'>) => Promise<MutationResult>;
  /** ينشئ خزنة رئيسية إذا لم يوجد أي حساب — لتفعيل المصاريف والمدفوعات */
  setupMainVault: (input: { openingBalance: number; name?: string }) => Promise<MutationResult>;
  /** ضبط الرصيد الافتتاحي لخزنة أو بنك (لبدء التشغيل من رصيد قائم) */
  setAccountOpeningBalance: (input: {
    type: AccountSourceType;
    id: string;
    openingBalance: number;
    note?: string;
  }) => Promise<MutationResult>;
  /** ضبط رصيد الحليب الافتتاحي للدورة النشطة (مثلاً متبقي 30/5) */
  setSessionOpeningStock: (input: {
    quantity: number;
    unitCost: number;
    note?: string;
  }) => Promise<MutationResult>;
  recordTransfer: (input: {
    fromType: AccountSourceType;
    fromId: string;
    toType: AccountSourceType;
    toId: string;
    amount: number;
    date?: string;
    referenceDoc?: string;
    notes?: string;
  }) => Promise<MutationResult>;

  // v3.0 — المصاريف
  recordExpense: (input: {
    categoryId: string;
    amount: number;
    description: string;
    paidFromType: AccountSourceType;
    paidFromId: string;
    date?: string;
    invoiceRef?: string;
  }) => Promise<MutationResult>;
  updateExpense: (id: string, patch: Partial<Pick<Expense, 'categoryId' | 'amount' | 'description' | 'date' | 'invoiceRef'>>) => Promise<MutationResult>;
  deleteExpense: (id: string) => Promise<MutationResult>;
  addExpenseCategory: (input: { name: string; group: ExpenseGroup; budgetMonthly?: number; isRecurring?: boolean }) => Promise<MutationResult>;
  updateExpenseCategory: (id: string, patch: Partial<ExpenseCategory>) => Promise<MutationResult>;
  deleteExpenseCategory: (id: string) => Promise<MutationResult>;

  recordExternalIncome: (input: {
    amount: number;
    description: string;
    destinationType: AccountSourceType;
    destinationId: string;
    date?: string;
  }) => Promise<MutationResult>;
  updateExternalIncome: (id: string, patch: Partial<Pick<ExternalIncome, 'amount' | 'description' | 'date'>>) => Promise<MutationResult>;
  deleteExternalIncome: (id: string) => Promise<MutationResult>;

  // v3.0 — الموظفون والرواتب
  addEmployee: (input: Omit<Employee, 'id' | 'code' | 'createdAt'>) => Promise<MutationResult>;
  updateEmployee: (id: string, patch: Partial<Employee>) => Promise<MutationResult>;
  deleteEmployee: (id: string) => Promise<MutationResult>;
  createPayrollBatch: (input: {
    label: string;
    payrollType: PayrollBatch['payrollType'];
    periodFrom: string;
    periodTo: string;
  }) => Promise<MutationResult>;
  payPayrollBatch: (batchId: string, source: { type: AccountSourceType; id: string }) => Promise<MutationResult>;

  // settings & demo
  updateSettings: (patch: Partial<AppSettings>) => Promise<MutationResult>;
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
    debtEntries: DebtEntry[];
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
    externalIncomes: ExternalIncome[];
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

function sessionFromCycle(year: number, month0: number, cycleNumber: 1 | 2): Session {
  const w = cycleOfMonth(year, month0, cycleNumber);
  return {
    id: cycleSessionId(year, month0, cycleNumber),
    label: w.label,
    periodFrom: fmtLocalDate(w.from),
    periodTo: fmtLocalDate(w.to),
    status: 'open',
    cycleNumber,
    openingStock: 0,
    openingAvgCost: 0,
    openingPayables: 0,
    openingReceivables: 0,
    createdAt: new Date().toISOString(),
  };
}

async function mutateWithDb(
  update: () => void,
  ops: { table: string; rows?: Record<string, unknown>[]; deletes?: string[] }[],
): Promise<MutationResult> {
  if (isSupabaseConfigured()) {
    try {
      const { persistMutation } = await import('@/lib/supabase/live-db');
      await persistMutation(ops, update);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'فشل الحفظ في قاعدة البيانات' };
    }
  }
  update();
  return { ok: true };
}

function nextRef(prefix: string, existing: { ref: string }[], year = new Date().getFullYear()): string {
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

function farmerDeleteBlock(state: ErpState, id: string): string | null {
  if (state.supplies.some((s) => s.farmerId === id)) return 'يوجد استلام مرتبط بهذا الفلاح.';
  if (state.payments.some((p) => p.kind === 'farmer_payment' && p.partyId === id)) return 'يوجد مدفوعات مرتبطة.';
  if (state.debtEntries.some((d) => d.partyKind === 'farmer' && d.partyId === id && d.amount > 0.01))
    return 'يوجد ديون قائمة — سدّدها أو احذفها أولاً.';
  return null;
}

function customerDeleteBlock(state: ErpState, id: string): string | null {
  if (state.sales.some((s) => s.customerId === id)) return 'يوجد مبيعات مرتبطة بهذا العميل.';
  if (state.payments.some((p) => p.kind === 'customer_payment' && p.partyId === id)) return 'يوجد تحصيلات مرتبطة.';
  if (state.debtEntries.some((d) => d.partyKind === 'customer' && d.partyId === id && d.amount > 0.01))
    return 'يوجد ديون قائمة — سدّدها أو احذفها أولاً.';
  return null;
}

function employeeDeleteBlock(state: ErpState, id: string): string | null {
  if (state.payments.some((p) => p.kind === 'employee_advance' && p.partyId === id)) return 'يوجد سلف مرتبطة.';
  if (state.payrollBatches.some((b) => b.lines.some((l) => l.employeeId === id))) return 'يوجد سجلات رواتب مرتبطة.';
  if (state.debtEntries.some((d) => d.partyKind === 'employee' && d.partyId === id && d.amount > 0.01))
    return 'يوجد ديون قائمة — سدّدها أو احذفها أولاً.';
  return null;
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
      debtEntries: [],
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
      externalIncomes: [],

      login: (user) => set({ auth: { ...DEFAULT_USER, ...user } }),
      logout: () => set({ auth: null }),

      setActiveSession: async (id) => {
        const state = get();
        if (!state.sessions.some((s) => s.id === id)) {
          return { ok: false, error: 'الدورة غير موجودة.' };
        }
        if (isSupabaseConfigured()) {
          try {
            const { applyLocalDbWrite } = await import('@/lib/supabase/live-db');
            const { persistAppSettings } = await import('@/lib/supabase/repository');
            await persistAppSettings({ activeSessionId: id, settings: state.settings });
            applyLocalDbWrite(() => set({ activeSessionId: id }));
          } catch (e) {
            return { ok: false, error: e instanceof Error ? e.message : 'فشل حفظ الدورة النشطة' };
          }
          return { ok: true, id };
        }
        set({ activeSessionId: id });
        return { ok: true, id };
      },

      createSessionForCycle: async (input) => {
        const state = get();
        const month0 = input.month;
        if (month0 < 0 || month0 > 11) return { ok: false, error: 'الشهر غير صالح.' };
        const session = sessionFromCycle(input.year, month0, input.cycleNumber);
        if (state.sessions.some((s) => s.id === session.id)) {
          return { ok: false, error: 'هذه الدورة موجودة — اخترها من القائمة.' };
        }
        const audit = makeAudit(state, 'session', session.id, 'create', `إنشاء دورة: ${session.label}`);
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              sessions: [...s.sessions, session].sort((a, b) => a.periodFrom.localeCompare(b.periodFrom)),
              activeSessionId: session.id,
              auditLogs: [audit, ...s.auditLogs],
            })),
          [{ table: 'sessions', rows: [session as unknown as Record<string, unknown>] }],
        );
        return res.ok ? { ok: true, id: session.id } : res;
      },

      closeActiveSession: async () => {
        const state = get();
        const active = state.sessions.find((s) => s.id === state.activeSessionId);
        if (!active) return { ok: false, error: 'لا توجد فترة نشطة.' };
        if (active.status === 'archived') return { ok: false, error: 'الفترة مؤرشفة بالفعل.' };

        const inv = buildInventoryLedger(state.supplies, state.sales, state.adjustments, state.sessions);
        const erpSnapshot: ErpData = {
          sessions: state.sessions,
          activeSessionId: state.activeSessionId,
          farmers: state.farmers,
          customers: state.customers,
          employees: state.employees,
          supplies: state.supplies,
          sales: state.sales,
          payments: state.payments,
          debtEntries: state.debtEntries,
          adjustments: state.adjustments,
          expenses: state.expenses,
          payrollBatches: state.payrollBatches,
          vaults: state.vaults,
          banks: state.banks,
          cashMovements: state.cashMovements,
          externalIncomes: state.externalIncomes,
          settings: state.settings,
        };
        const summary = computeSessionSummary(active, erpSnapshot, inv);
        const carrySnapshot = buildSessionCarryForwardSnapshot(erpSnapshot, active, inv.currentStock);

        const sessionFarmerStats = state.farmers.map((f) =>
          computeFarmerSessionStats(f, active, state.supplies, state.payments, state.debtEntries),
        );
        const customerStats = state.customers.map((c) =>
          computeCustomerStats(c, state.sales, state.payments, state.debtEntries),
        );
        const payables = carrySnapshot.totals.payables;
        const receivables = carrySnapshot.totals.receivables;

        const archived: Session = {
          ...active,
          status: 'archived',
          closedAt: carrySnapshot.closedAt,
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
                .filter((f) => f.supplyCount > 0 || f.paymentCount > 0 || f.carriedForward > 0.01)
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
              employees: carrySnapshot.employees,
              external: carrySnapshot.external,
            },
            carryForward: {
              openingStock: carrySnapshot.totals.openingStock,
              payables,
              receivables,
            },
          },
        };

        const dayAfter = new Date(active.periodTo + 'T00:00:00');
        dayAfter.setDate(dayAfter.getDate() + 1);
        const w = cycleForDate(dayAfter);
        const newId = cycleSessionId(w.year, w.month, w.cycleNumber);
        const carriedStock = carrySnapshot.totals.openingStock;
        const nextPayload: Session = {
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
          carryForwardBalances: carrySnapshot,
          createdAt: new Date().toISOString(),
        };

        const audit = makeAudit(
          state,
          'session',
          active.id,
          'close',
          `إغلاق الدورة «${active.label}» — مبيعات ${formatMoney(round(summary.salesRevenue), { decimals: 0 })}، ربح ${formatMoney(round(summary.grossProfit), { decimals: 0 })}، مخزون مرحّل ${formatLiters(carriedStock, 0, false)}، ديون مرحّلة ${formatMoney(payables + receivables, { decimals: 0 })}`,
        );

        const archivedSessions = state.sessions.map((s) => (s.id === active.id ? archived : s));
        const existingNextIdx = archivedSessions.findIndex((s) => s.id === newId);
        const sessionRows: Session[] =
          existingNextIdx >= 0
            ? archivedSessions.map((s, i) => (i === existingNextIdx ? { ...s, ...nextPayload, createdAt: s.createdAt } : s))
            : [...archivedSessions, nextPayload];
        const rowsToPersist = existingNextIdx >= 0 ? [archived, sessionRows[existingNextIdx]!] : [archived, nextPayload];

        const res = await mutateWithDb(
          () =>
            set({
              sessions: sessionRows,
              activeSessionId: newId,
              auditLogs: [audit, ...state.auditLogs],
            }),
          [
            { table: 'sessions', rows: rowsToPersist as unknown as Record<string, unknown>[] },
            { table: 'audit_logs', rows: [audit as unknown as Record<string, unknown>] },
          ],
        );
        if (res.ok && isSupabaseConfigured()) {
          try {
            const { persistAppSettings } = await import('@/lib/supabase/repository');
            await persistAppSettings({ activeSessionId: newId, settings: state.settings });
          } catch {
            return { ok: false, error: 'تم الإغلاق محلياً لكن فشل حفظ الدورة النشطة في السحابة.' };
          }
        }
        return res.ok ? { ok: true, id: newId } : res;
      },

      addFarmer: async (input) => {
        const state = get();
        const { openingBalance, ...farmerInput } = input;
        const code = nextPartyCode('F', state.farmers);
        const farmer: Farmer = {
          ...farmerInput,
          id: uid('farmer-'),
          code,
          onboardingDate: farmerInput.onboardingDate.slice(0, 10),
          createdAt: new Date().toISOString(),
        };
        const audit = makeAudit(state, 'farmer', farmer.id, 'create', `إضافة فلاح: ${farmer.fullName}`);
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              farmers: [farmer, ...s.farmers],
              auditLogs: [audit, ...s.auditLogs],
            })),
          [{ table: 'farmers', rows: [farmer as unknown as Record<string, unknown>] }],
        );
        if (!res.ok) return res;
        if (openingBalance && openingBalance.amount > 0) {
          const debtRes = await get().recordDebtEntry({
            partyKind: 'farmer',
            partyId: farmer.id,
            amount: openingBalance.amount,
            direction: openingBalance.direction,
            description: 'رصيد افتتاحي',
            date: `${farmer.onboardingDate}T12:00:00.000Z`,
          });
          if (!debtRes.ok) return debtRes;
        }
        return { ok: true, id: farmer.id };
      },
      updateFarmer: async (id, patch) => {
        const state = get();
        const existing = state.farmers.find((f) => f.id === id);
        if (!existing) return { ok: false, error: 'الفلاح غير موجود.' };
        const updated: Farmer = {
          ...existing,
          ...patch,
          onboardingDate: (patch.onboardingDate ?? existing.onboardingDate).slice(0, 10),
        };
        if (isSupabaseConfigured()) {
          try {
            const { persistMutation } = await import('@/lib/supabase/live-db');
            await persistMutation(
              [{ table: 'farmers', rows: [updated as unknown as Record<string, unknown>] }],
              () => set((s) => ({ farmers: s.farmers.map((f) => (f.id === id ? updated : f)) })),
            );
          } catch (e) {
            return { ok: false, error: e instanceof Error ? e.message : 'فشل تحديث الفلاح' };
          }
          return { ok: true, id };
        }
        set((s) => ({ farmers: s.farmers.map((f) => (f.id === id ? updated : f)) }));
        return { ok: true, id };
      },

      deleteFarmer: async (id) => {
        const state = get();
        const existing = state.farmers.find((f) => f.id === id);
        if (!existing) return { ok: false, error: 'الفلاح غير موجود.' };
        const block = farmerDeleteBlock(state, id);
        if (block) return { ok: false, error: block };
        const audit = makeAudit(state, 'farmer', id, 'delete', `حذف فلاح: ${existing.fullName}`);
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              farmers: s.farmers.filter((f) => f.id !== id),
              auditLogs: [audit, ...s.auditLogs],
            })),
          [{ table: 'farmers', deletes: [id] }],
        );
        return res.ok ? { ok: true, id } : res;
      },

      addCustomer: async (input) => {
        const state = get();
        const code = nextPartyCode('C', state.customers);
        const customer: Customer = {
          ...input,
          id: uid('customer-'),
          code,
          onboardingDate: input.onboardingDate.slice(0, 10),
          createdAt: new Date().toISOString(),
        };
        if (isSupabaseConfigured()) {
          try {
            const { persistMutation } = await import('@/lib/supabase/live-db');
            await persistMutation(
              [{ table: 'customers', rows: [customer as unknown as Record<string, unknown>] }],
              () => set((s) => ({ customers: [customer, ...s.customers] })),
            );
          } catch (e) {
            return { ok: false, error: e instanceof Error ? e.message : 'فشل حفظ العميل' };
          }
          return { ok: true, id: customer.id };
        }
        set((s) => ({ customers: [customer, ...s.customers] }));
        return { ok: true, id: customer.id };
      },
      updateCustomer: async (id, patch) => {
        const state = get();
        const existing = state.customers.find((c) => c.id === id);
        if (!existing) return { ok: false, error: 'العميل غير موجود.' };
        const updated: Customer = {
          ...existing,
          ...patch,
          onboardingDate: (patch.onboardingDate ?? existing.onboardingDate).slice(0, 10),
        };
        if (isSupabaseConfigured()) {
          try {
            const { persistMutation } = await import('@/lib/supabase/live-db');
            await persistMutation(
              [{ table: 'customers', rows: [updated as unknown as Record<string, unknown>] }],
              () => set((s) => ({ customers: s.customers.map((c) => (c.id === id ? updated : c)) })),
            );
          } catch (e) {
            return { ok: false, error: e instanceof Error ? e.message : 'فشل تحديث العميل' };
          }
          return { ok: true, id };
        }
        set((s) => ({ customers: s.customers.map((c) => (c.id === id ? updated : c)) }));
        return { ok: true, id };
      },

      deleteCustomer: async (id) => {
        const state = get();
        const existing = state.customers.find((c) => c.id === id);
        if (!existing) return { ok: false, error: 'العميل غير موجود.' };
        const block = customerDeleteBlock(state, id);
        if (block) return { ok: false, error: block };
        const audit = makeAudit(state, 'customer', id, 'delete', `حذف عميل: ${existing.entityName}`);
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              customers: s.customers.filter((c) => c.id !== id),
              auditLogs: [audit, ...s.auditLogs],
            })),
          [{ table: 'customers', deletes: [id] }],
        );
        return res.ok ? { ok: true, id } : res;
      },

      recordSupply: async (input) => {
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
            return { ok: false, error: `رصيد الحساب (${formatMoney(Math.floor(bal), { decimals: 0 })}) لا يكفي للدفع الفوري.` };
        }

        const shift = input.milkShift ?? 'morning';
        const date =
          input.date ??
          (() => {
            const d = new Date();
            d.setHours(shift === 'evening' ? 17 : 6, 0, 0, 0);
            return d.toISOString();
          })();
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
          milkShift: shift,
          fatPct: input.fatPct,
          notes: input.notes,
          createdAt: new Date().toISOString(),
          createdBy: state.auth?.name,
        };

        let payment: Payment | null = null;
        let movement: CashMovement | null = null;

        if (ip) {
          const payId = uid('pay-');
          payment = {
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
            reference: ip.reference ?? tx.ref,
            notes: 'دفع فوري عند استلام الحليب',
            settlementComplete: ip.settlementComplete ?? (ip.amount >= total - 0.01),
            createdAt: new Date().toISOString(),
            createdBy: state.auth?.name,
          };
          movement = {
            id: uid('cm-'),
            ref: nextRef('CM', state.cashMovements),
            movementType: 'farmer_payout',
            sourceType: ip.sourceType,
            sourceId: ip.sourceId,
            amount: round(ip.amount),
            direction: 'out',
            referenceType: 'payment',
            referenceId: payId,
            description: `دفع فوري — استلام ${farmer.fullName}`,
            sessionId: state.activeSessionId,
            date,
            createdAt: new Date().toISOString(),
          };
        }

        const audit = makeAudit(state, 'supply', tx.id, 'create', `استلام من ${farmer.fullName} — ${formatLiters(tx.quantity, 0, false)}`);
        const dbOps: { table: string; rows: Record<string, unknown>[] }[] = [
          { table: 'supplies', rows: [tx as unknown as Record<string, unknown>] },
        ];
        if (payment) dbOps.push({ table: 'payments', rows: [payment as unknown as Record<string, unknown>] });
        if (movement) dbOps.push({ table: 'cash_movements', rows: [movement as unknown as Record<string, unknown>] });

        const res = await mutateWithDb(
          () =>
            set((s) => ({
              supplies: [tx, ...s.supplies],
              payments: payment ? [payment, ...s.payments] : s.payments,
              cashMovements: movement ? [movement, ...s.cashMovements] : s.cashMovements,
              auditLogs: [audit, ...s.auditLogs],
            })),
          dbOps,
        );
        return res.ok ? { ok: true, id: tx.id } : res;
      },

      recordSale: async (input) => {
        const state = get();
        const gate = requireOpenSession(state);
        if (!gate.ok) return gate;
        if (input.quantity <= 0) return { ok: false, error: 'الكمية يجب أن تكون أكبر من صفر.' };
        if (input.unitPrice <= 0) return { ok: false, error: 'سعر البيع يجب أن يكون أكبر من صفر.' };
        const customer = state.customers.find((c) => c.id === input.customerId);
        if (!customer) return { ok: false, error: 'العميل غير موجود.' };
        if (customer.onHold) return { ok: false, error: 'حساب العميل مجمّد — لا يمكن البيع له.' };
        const stock = currentStockOf(state);
        if (input.quantity > stock + 0.001) {
          return {
            ok: false,
            error: `الكمية المطلوبة (${formatLiters(input.quantity, 0, false)}) تتجاوز المخزون المتاح (${formatLiters(Math.floor(stock), 0, false)}).`,
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
        const audit = makeAudit(state, 'sale', tx.id, 'create', `بيع لـ ${customer.entityName} — ${formatLiters(tx.quantity, 0, false)}`);
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              sales: [tx, ...s.sales],
              auditLogs: [audit, ...s.auditLogs],
            })),
          [{ table: 'sales', rows: [tx as unknown as Record<string, unknown>] }],
        );
        return res.ok ? { ok: true, id: tx.id } : res;
      },

      recordFarmerPayment: async (input) => {
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
            return { ok: false, error: `الرصيد المتاح (${formatMoney(Math.floor(bal), { decimals: 0 })}) لا يكفي للدفع.` };
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

        const audit = makeAudit(state, 'payment', tx.id, 'pay', `دفعة للفلاح ${farmer?.fullName ?? ''}: ${formatMoney(amount, { decimals: 0 })}`);
        const dbOps: { table: string; rows: Record<string, unknown>[] }[] = [
          { table: 'payments', rows: [tx as unknown as Record<string, unknown>] },
        ];
        if (movement) dbOps.push({ table: 'cash_movements', rows: [movement as unknown as Record<string, unknown>] });

        const res = await mutateWithDb(
          () =>
            set((s) => ({
              payments: [tx, ...s.payments],
              cashMovements: movement ? [movement, ...s.cashMovements] : s.cashMovements,
              auditLogs: [audit, ...s.auditLogs],
            })),
          dbOps,
        );
        return res.ok ? { ok: true, id: tx.id } : res;
      },

      recordCustomerPayment: async (input) => {
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

        const audit = makeAudit(state, 'payment', tx.id, 'pay', `تحصيل من العميل ${customer?.entityName ?? ''}: ${formatMoney(amount, { decimals: 0 })}`);
        const dbOps: { table: string; rows: Record<string, unknown>[] }[] = [
          { table: 'payments', rows: [tx as unknown as Record<string, unknown>] },
        ];
        if (movement) dbOps.push({ table: 'cash_movements', rows: [movement as unknown as Record<string, unknown>] });

        const res = await mutateWithDb(
          () =>
            set((s) => ({
              payments: [tx, ...s.payments],
              cashMovements: movement ? [movement, ...s.cashMovements] : s.cashMovements,
              auditLogs: [audit, ...s.auditLogs],
            })),
          dbOps,
        );
        return res.ok ? { ok: true, id: tx.id } : res;
      },

      recordEmployeeAdvance: async (input) => {
        const state = get();
        const gate = requireOpenSession(state);
        if (!gate.ok) return gate;
        if (input.amount <= 0) return { ok: false, error: 'المبلغ يجب أن يكون أكبر من صفر.' };
        const employee = state.employees.find((e) => e.id === input.employeeId);
        if (!employee) return { ok: false, error: 'الموظف غير موجود.' };
        const amount = round(input.amount);
        const date = input.date ?? new Date().toISOString();
        const bal = accountBalance(input.sourceType, input.sourceId, state.vaults, state.banks, state.cashMovements);
        if (amount > bal + 0.001)
          return { ok: false, error: `الرصيد المتاح (${formatMoney(Math.floor(bal), { decimals: 0 })}) لا يكفي للسلفة.` };

        const tx: Payment = {
          id: uid('pay-'),
          ref: nextRef('ADV', state.payments.filter((p) => p.kind === 'employee_advance')),
          kind: 'employee_advance',
          partyId: input.employeeId,
          sessionId: state.activeSessionId,
          date,
          amount,
          method: input.method,
          paidFromType: input.sourceType,
          paidFromId: input.sourceId,
          reference: input.reference,
          notes: input.notes,
          createdAt: new Date().toISOString(),
          createdBy: state.auth?.name,
        };

        const movement: CashMovement = {
          id: uid('cm-'),
          ref: nextRef('CM', state.cashMovements),
          movementType: 'expense',
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          amount,
          direction: 'out',
          referenceType: 'payment',
          referenceId: tx.id,
          description: `سلفة للموظف ${employee.fullName}`.trim(),
          sessionId: state.activeSessionId,
          date,
          createdAt: new Date().toISOString(),
        };

        const audit = makeAudit(state, 'payment', tx.id, 'pay', `سلفة للموظف ${employee.fullName}: ${formatMoney(amount, { decimals: 0 })}`);
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              payments: [tx, ...s.payments],
              cashMovements: [movement, ...s.cashMovements],
              auditLogs: [audit, ...s.auditLogs],
            })),
          [
            { table: 'payments', rows: [tx as unknown as Record<string, unknown>] },
            { table: 'cash_movements', rows: [movement as unknown as Record<string, unknown>] },
          ],
        );
        return res.ok ? { ok: true, id: tx.id } : res;
      },

      recordDebtEntry: async (input) => {
        const state = get();
        const gate = requireOpenSession(state);
        if (!gate.ok) return gate;
        if (input.amount <= 0) return { ok: false, error: 'المبلغ يجب أن يكون أكبر من صفر.' };

        const direction = input.direction ?? defaultDebtDirection(input.partyKind);
        let partyName = input.partyName?.trim() ?? '';
        let partyId = input.partyId;

        if (input.partyKind === 'external') {
          if (!partyName) return { ok: false, error: 'أدخل اسم الطرف الخارجي.' };
          partyId = partyId ?? uid('ext-');
        } else if (input.partyKind === 'farmer') {
          const farmer = state.farmers.find((f) => f.id === partyId);
          if (!farmer) return { ok: false, error: 'الفلاح غير موجود.' };
          partyName = farmer.fullName;
        } else if (input.partyKind === 'customer') {
          const customer = state.customers.find((c) => c.id === partyId);
          if (!customer) return { ok: false, error: 'العميل غير موجود.' };
          partyName = customer.entityName;
        } else {
          const employee = state.employees.find((e) => e.id === partyId);
          if (!employee) return { ok: false, error: 'الموظف غير موجود.' };
          partyName = employee.fullName;
        }

        const amount = round(input.amount);
        const dateRaw = input.date ?? new Date().toISOString();
        const entry: DebtEntry = {
          id: uid('deb-'),
          ref: nextRef('DEB', state.debtEntries),
          sessionId: state.activeSessionId,
          date: dateRaw.slice(0, 10),
          partyKind: input.partyKind,
          partyId,
          partyName: input.partyKind === 'external' ? partyName : undefined,
          amount,
          direction,
          description: input.description?.trim() || undefined,
          createdAt: new Date().toISOString(),
          createdBy: state.auth?.name,
        };

        const kindLabel =
          input.partyKind === 'farmer'
            ? 'فلاح'
            : input.partyKind === 'customer'
              ? 'عميل'
              : input.partyKind === 'employee'
                ? 'موظف'
                : 'خارجي';
        const audit = makeAudit(
          state,
          'debt',
          entry.id,
          'create',
          `تسجيل دين — ${kindLabel} ${partyName}: ${formatMoney(amount, { decimals: 0 })}${entry.description ? ` (${entry.description})` : ''}`,
        );

        const res = await mutateWithDb(
          () =>
            set((s) => ({
              debtEntries: [entry, ...s.debtEntries],
              auditLogs: [audit, ...s.auditLogs],
            })),
          [{ table: 'debt_entries', rows: [entry as unknown as Record<string, unknown>] }],
        );
        return res.ok ? { ok: true, id: entry.id } : res;
      },

      updateDebtEntry: async (id, patch) => {
        const state = get();
        const existing = state.debtEntries.find((d) => d.id === id);
        if (!existing) return { ok: false, error: 'سجل الدين غير موجود.' };
        const updated: DebtEntry = {
          ...existing,
          ...patch,
          amount: patch.amount != null ? round(patch.amount) : existing.amount,
          date: patch.date ? patch.date.slice(0, 10) : existing.date,
          partyName: patch.partyName?.trim() || existing.partyName,
        };
        if (updated.amount <= 0) return { ok: false, error: 'المبلغ يجب أن يكون أكبر من صفر.' };
        const settled = existing.settledAmount ?? 0;
        const minAmount = settled > 0.01 ? settled : 0;
        if (updated.amount < minAmount - 0.01) {
          return { ok: false, error: `لا يمكن أن يقل المبلغ عن المُسَدَّد (${formatMoney(minAmount, { decimals: 0 })}).` };
        }
        const audit = makeAudit(state, 'debt', id, 'update', `تعديل دين ${existing.ref}`);
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              debtEntries: s.debtEntries.map((d) => (d.id === id ? updated : d)),
              auditLogs: [audit, ...s.auditLogs],
            })),
          [{ table: 'debt_entries', rows: [updated as unknown as Record<string, unknown>] }],
        );
        return res.ok ? { ok: true, id } : res;
      },

      settleDebtEntry: async (id, input) => {
        const state = get();
        const gate = requireOpenSession(state);
        if (!gate.ok) return gate;

        const entry = state.debtEntries.find((d) => d.id === id);
        if (!entry) return { ok: false, error: 'سجل الدين غير موجود.' };
        if (isDebtFullySettled(entry)) return { ok: false, error: 'هذا الدين مُسَدَّد بالكامل.' };

        const remaining = debtRemainingAmount(entry);
        const amount = round(input.amount);
        if (amount <= 0) return { ok: false, error: 'المبلغ يجب أن يكون أكبر من صفر.' };
        if (amount > remaining + 0.01) {
          return { ok: false, error: `المتبقي على الدين ${formatMoney(remaining, { decimals: 0 })}.` };
        }

        const useSource = Boolean(input.sourceType && input.sourceId);
        const cashOut = debtSettlementIsCashOut(entry);
        if (useSource && cashOut) {
          const bal = accountBalance(input.sourceType!, input.sourceId!, state.vaults, state.banks, state.cashMovements);
          if (amount > bal + 0.001) {
            return { ok: false, error: `الرصيد المتاح (${formatMoney(Math.floor(bal), { decimals: 0 })}) لا يكفي.` };
          }
        }

        const date = input.date ?? new Date().toISOString();
        const partyLabel =
          entry.partyKind === 'external'
            ? entry.partyName ?? 'طرف خارجي'
            : entry.partyKind === 'farmer'
              ? state.farmers.find((f) => f.id === entry.partyId)?.fullName ?? 'فلاح'
              : entry.partyKind === 'customer'
                ? state.customers.find((c) => c.id === entry.partyId)?.entityName ?? 'عميل'
                : state.employees.find((e) => e.id === entry.partyId)?.fullName ?? 'موظف';

        const newSettled = round((entry.settledAmount ?? 0) + amount);
        const newAmount = round(Math.max(0, entry.amount - amount));
        const fullySettled = newAmount <= 0.01;
        const updatedEntry: DebtEntry = {
          ...entry,
          amount: newAmount,
          settledAmount: newSettled,
          settledAt: fullySettled ? new Date().toISOString() : entry.settledAt,
        };

        const noteSuffix = input.notes?.trim() ? ` — ${input.notes.trim()}` : '';
        const settlementNote = `تسوية دين ${entry.ref}${noteSuffix}`;

        const dbRows: { table: string; rows: Record<string, unknown>[] }[] = [
          { table: 'debt_entries', rows: [updatedEntry as unknown as Record<string, unknown>] },
        ];

        let movement: CashMovement | null = null;

        if (useSource) {
          const movementType =
            entry.partyKind === 'farmer' && cashOut
              ? 'farmer_payout'
              : entry.partyKind === 'customer' && !cashOut
                ? 'sale_payment'
                : cashOut
                  ? 'expense'
                  : 'income';
          movement = {
            id: uid('cm-'),
            ref: nextRef('CM', state.cashMovements),
            movementType,
            sourceType: input.sourceType!,
            sourceId: input.sourceId!,
            amount,
            direction: cashOut ? 'out' : 'in',
            referenceType: 'debt',
            referenceId: entry.id,
            description: `${settlementNote} — ${partyLabel}`,
            sessionId: state.activeSessionId,
            date,
            createdAt: new Date().toISOString(),
            createdBy: state.auth?.name,
          };
          dbRows.push({ table: 'cash_movements', rows: [movement as unknown as Record<string, unknown>] });
        }

        const audit = makeAudit(
          state,
          'debt',
          entry.id,
          'update',
          `${settlementNote}: ${formatMoney(amount, { decimals: 0 })} — ${partyLabel}`,
        );

        const res = await mutateWithDb(
          () =>
            set((s) => ({
              debtEntries: s.debtEntries.map((d) => (d.id === id ? updatedEntry : d)),
              cashMovements: movement ? [movement, ...s.cashMovements] : s.cashMovements,
              auditLogs: [audit, ...s.auditLogs],
            })),
          dbRows,
        );
        return res.ok ? { ok: true, id } : res;
      },

      deleteDebtEntry: async (id) => {
        const state = get();
        const existing = state.debtEntries.find((d) => d.id === id);
        if (!existing) return { ok: false, error: 'سجل الدين غير موجود.' };
        const audit = makeAudit(state, 'debt', id, 'delete', `حذف دين ${existing.ref}`);
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              debtEntries: s.debtEntries.filter((d) => d.id !== id),
              auditLogs: [audit, ...s.auditLogs],
            })),
          [{ table: 'debt_entries', deletes: [id] }],
        );
        return res.ok ? { ok: true, id } : res;
      },

      addAdjustment: async (input) => {
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
        const audit = makeAudit(state, 'adjustment', tx.id, 'create', `تسوية مخزون: ${tx.reason}`);
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              adjustments: [tx, ...s.adjustments],
              auditLogs: [audit, ...s.auditLogs],
            })),
          [{ table: 'inventory_adjustments', rows: [tx as unknown as Record<string, unknown>] }],
        );
        return res.ok ? { ok: true, id: tx.id } : res;
      },

      deleteSupply: async (id) => {
        const state = get();
        const tx = state.supplies.find((s) => s.id === id);
        if (!tx) return { ok: false, error: 'عملية الاستلام غير موجودة.' };
        const linkedPayments = state.payments.filter(
          (p) => p.kind === 'farmer_payment' && p.partyId === tx.farmerId && p.reference === tx.ref,
        );
        const paymentIds = linkedPayments.map((p) => p.id);
        const cmIds = state.cashMovements
          .filter((m) => m.referenceType === 'payment' && m.referenceId && paymentIds.includes(m.referenceId))
          .map((m) => m.id);
        const audit = makeAudit(state, 'supply', id, 'delete', `حذف استلام ${tx.ref}`);
        return mutateWithDb(
          () =>
            set((s) => ({
              supplies: s.supplies.filter((x) => x.id !== id),
              payments: s.payments.filter((p) => !paymentIds.includes(p.id)),
              cashMovements: s.cashMovements.filter((m) => !cmIds.includes(m.id)),
              auditLogs: [audit, ...s.auditLogs],
            })),
          [
            { table: 'supplies', deletes: [id] },
            ...(paymentIds.length ? [{ table: 'payments', deletes: paymentIds }] : []),
            ...(cmIds.length ? [{ table: 'cash_movements', deletes: cmIds }] : []),
          ],
        ).then((r) => (r.ok ? { ok: true, id } : r));
      },

      deleteSale: async (id) => {
        const state = get();
        const tx = state.sales.find((s) => s.id === id);
        if (!tx) return { ok: false, error: 'عملية البيع غير موجودة.' };
        const audit = makeAudit(state, 'sale', id, 'delete', `حذف بيع ${tx.ref}`);
        return mutateWithDb(
          () =>
            set((s) => ({
              sales: s.sales.filter((x) => x.id !== id),
              auditLogs: [audit, ...s.auditLogs],
            })),
          [{ table: 'sales', deletes: [id] }],
        ).then((r) => (r.ok ? { ok: true, id } : r));
      },

      updateSupply: async (id, patch) => {
        const state = get();
        const gate = requireOpenSession(state);
        if (!gate.ok) return gate;
        const existing = state.supplies.find((s) => s.id === id);
        if (!existing) return { ok: false, error: 'عملية الاستلام غير موجودة.' };
        const hasLinkedPay = state.payments.some(
          (p) => p.kind === 'farmer_payment' && p.reference === existing.ref,
        );
        if (hasLinkedPay) {
          return { ok: false, error: 'لا يمكن تعديل استلام مرتبط بدفع فوري — احذفه وأعد التسجيل.' };
        }

        const sampleQty = round(Math.max(0, patch.sampleQty ?? existing.sampleQty ?? 0));
        const quantity = round(patch.quantity ?? existing.quantity);
        const unitPrice = round(patch.unitPrice ?? existing.unitPrice, 3);
        if (quantity <= 0) return { ok: false, error: 'الكمية يجب أن تكون أكبر من صفر.' };
        if (unitPrice <= 0) return { ok: false, error: 'سعر الشراء يجب أن يكون أكبر من صفر.' };
        if (sampleQty > quantity) return { ok: false, error: 'كمية العينة لا يمكن أن تتجاوز الكمية الكلية.' };

        if (quantity < existing.quantity) {
          const delta = existing.quantity - quantity;
          const stock = currentStockOf(state);
          if (delta > stock + 0.001) {
            return {
              ok: false,
              error: `لا يمكن تقليل الكمية — المخزون المتاح (${formatLiters(Math.floor(stock), 0, false)}) لا يكفي.`,
            };
          }
        }

        const billableQty = round(quantity - sampleQty);
        const updated: SupplyTransaction = {
          ...existing,
          ...patch,
          quantity,
          unitPrice,
          sampleQty: sampleQty > 0 ? sampleQty : undefined,
          total: round(billableQty * unitPrice),
          date: patch.date ?? existing.date,
        };
        const audit = makeAudit(state, 'supply', id, 'update', `تعديل استلام ${existing.ref}`);
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              supplies: s.supplies.map((x) => (x.id === id ? updated : x)),
              auditLogs: [audit, ...s.auditLogs],
            })),
          [{ table: 'supplies', rows: [updated as unknown as Record<string, unknown>] }],
        );
        return res.ok ? { ok: true, id } : res;
      },

      updateSale: async (id, patch) => {
        const state = get();
        const gate = requireOpenSession(state);
        if (!gate.ok) return gate;
        const existing = state.sales.find((s) => s.id === id);
        if (!existing) return { ok: false, error: 'عملية البيع غير موجودة.' };

        const quantity = round(patch.quantity ?? existing.quantity);
        const unitPrice = round(patch.unitPrice ?? existing.unitPrice, 3);
        if (quantity <= 0) return { ok: false, error: 'الكمية يجب أن تكون أكبر من صفر.' };
        if (unitPrice <= 0) return { ok: false, error: 'سعر البيع يجب أن يكون أكبر من صفر.' };

        if (quantity > existing.quantity) {
          const extra = quantity - existing.quantity;
          const stock = currentStockOf(state);
          if (extra > stock + 0.001) {
            return {
              ok: false,
              error: `الكمية الإضافية (${formatLiters(extra, 0, false)}) تتجاوز المخزون (${formatLiters(Math.floor(stock), 0, false)}).`,
            };
          }
        }

        const updated: SaleTransaction = {
          ...existing,
          ...patch,
          quantity,
          unitPrice,
          total: round(quantity * unitPrice),
          date: patch.date ?? existing.date,
          dueDate: patch.dueDate ?? existing.dueDate,
        };
        const audit = makeAudit(state, 'sale', id, 'update', `تعديل بيع ${existing.ref}`);
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              sales: s.sales.map((x) => (x.id === id ? updated : x)),
              auditLogs: [audit, ...s.auditLogs],
            })),
          [{ table: 'sales', rows: [updated as unknown as Record<string, unknown>] }],
        );
        return res.ok ? { ok: true, id } : res;
      },

      deletePayment: async (id) => {
        const state = get();
        const tx = state.payments.find((p) => p.id === id);
        if (!tx) return { ok: false, error: 'الدفعة غير موجودة.' };
        const cmIds = state.cashMovements
          .filter((m) => m.referenceType === 'payment' && m.referenceId === id)
          .map((m) => m.id);
        const audit = makeAudit(state, 'payment', id, 'delete', `حذف دفعة ${tx.ref}`);
        return mutateWithDb(
          () =>
            set((s) => ({
              payments: s.payments.filter((p) => p.id !== id),
              cashMovements: s.cashMovements.filter(
                (m) => !(m.referenceType === 'payment' && m.referenceId === id),
              ),
              auditLogs: [audit, ...s.auditLogs],
            })),
          [
            { table: 'payments', deletes: [id] },
            ...(cmIds.length ? [{ table: 'cash_movements', deletes: cmIds }] : []),
          ],
        ).then((r) => (r.ok ? { ok: true, id } : r));
      },

      deleteAdjustment: async (id) => {
        const state = get();
        const tx = state.adjustments.find((a) => a.id === id);
        if (!tx) return { ok: false, error: 'التسوية غير موجودة.' };
        const audit = makeAudit(state, 'adjustment', id, 'delete', `حذف تسوية ${tx.ref}`);
        return mutateWithDb(
          () =>
            set((s) => ({
              adjustments: s.adjustments.filter((a) => a.id !== id),
              auditLogs: [audit, ...s.auditLogs],
            })),
          [{ table: 'inventory_adjustments', deletes: [id] }],
        ).then((r) => (r.ok ? { ok: true, id } : r));
      },

      // ── v3.0: الخزن والبنوك ──────────────────────────────
      addVault: async (input) => {
        const state = get();
        const code = `V-${String(state.vaults.length + 1).padStart(2, '0')}`;
        const vault: CashVault = { ...input, id: uid('vault-'), code, createdAt: new Date().toISOString() };
        const audit = makeAudit(state, 'vault', vault.id, 'create', `إنشاء خزنة: ${vault.name}`);
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              vaults: [vault, ...s.vaults],
              auditLogs: [audit, ...s.auditLogs],
            })),
          [{ table: 'cash_vaults', rows: [vault as unknown as Record<string, unknown>] }],
        );
        return res.ok ? { ok: true, id: vault.id } : res;
      },
      updateVault: async (id, patch) => {
        const state = get();
        const existing = state.vaults.find((v) => v.id === id);
        if (!existing) return { ok: false, error: 'الخزنة غير موجودة.' };
        const updated = { ...existing, ...patch };
        const audit = makeAudit(state, 'vault', id, 'update', 'تعديل بيانات خزنة');
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              vaults: s.vaults.map((v) => (v.id === id ? updated : v)),
              auditLogs: [audit, ...s.auditLogs],
            })),
          [{ table: 'cash_vaults', rows: [updated as unknown as Record<string, unknown>] }],
        );
        return res.ok ? { ok: true, id } : res;
      },

      addBank: async (input) => {
        const state = get();
        const code = `B-${String(state.banks.length + 1).padStart(2, '0')}`;
        const bank: BankAccount = { ...input, id: uid('bank-'), code, createdAt: new Date().toISOString() };
        const audit = makeAudit(state, 'bank', bank.id, 'create', `إنشاء حساب بنكي: ${bank.bankName}`);
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              banks: [bank, ...s.banks],
              auditLogs: [audit, ...s.auditLogs],
            })),
          [{ table: 'bank_accounts', rows: [bank as unknown as Record<string, unknown>] }],
        );
        return res.ok ? { ok: true, id: bank.id } : res;
      },
      updateBank: async (id, patch) => {
        const state = get();
        const existing = state.banks.find((b) => b.id === id);
        if (!existing) return { ok: false, error: 'الحساب البنكي غير موجود.' };
        const updated = { ...existing, ...patch };
        const audit = makeAudit(state, 'bank', id, 'update', 'تعديل بيانات بنك');
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              banks: s.banks.map((b) => (b.id === id ? updated : b)),
              auditLogs: [audit, ...s.auditLogs],
            })),
          [{ table: 'bank_accounts', rows: [updated as unknown as Record<string, unknown>] }],
        );
        return res.ok ? { ok: true, id } : res;
      },

      setupMainVault: async (input) => {
        const state = get();
        if (state.vaults.length + state.banks.length > 0) {
          const existing = state.vaults.find((v) => v.isActive) ?? state.banks.find((b) => b.isActive);
          if (existing) return { ok: true, id: existing.id };
        }
        if (input.openingBalance < 0) return { ok: false, error: 'الرصيد الافتتاحي لا يمكن أن يكون سالباً.' };
        const code = 'V-01';
        const vault: CashVault = {
          id: uid('vault-'),
          code,
          name: input.name?.trim() || 'الخزنة الرئيسية',
          openingBalance: round(input.openingBalance),
          isActive: true,
          responsible: state.auth?.name ?? 'أمين الصندوق',
          location: 'المقر الرئيسي',
          minThreshold: 0,
          createdAt: new Date().toISOString(),
        };
        const audit = makeAudit(
          state,
          'vault',
          vault.id,
          'create',
          `إعداد خزنة: ${vault.name} — رصيد افتتاحي ${formatMoney(vault.openingBalance, { decimals: 0 })}`,
        );
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              vaults: [vault, ...s.vaults],
              auditLogs: [audit, ...s.auditLogs],
            })),
          [{ table: 'cash_vaults', rows: [vault as unknown as Record<string, unknown>] }],
        );
        return res.ok ? { ok: true, id: vault.id } : res;
      },

      setAccountOpeningBalance: async (input) => {
        const state = get();
        if (input.openingBalance < 0) return { ok: false, error: 'الرصيد الافتتاحي لا يمكن أن يكون سالباً.' };
        const amount = round(input.openingBalance);
        if (input.type === 'vault') {
          const vault = state.vaults.find((v) => v.id === input.id);
          if (!vault) return { ok: false, error: 'الخزنة غير موجودة.' };
          const updated = { ...vault, openingBalance: amount };
          const audit = makeAudit(
            state,
            'vault',
            input.id,
            'update',
            `ضبط رصيد افتتاحي — ${vault.name}: ${formatMoney(amount, { decimals: 0 })}${input.note ? ` (${input.note})` : ''}`,
          );
          const res = await mutateWithDb(
            () =>
              set((s) => ({
                vaults: s.vaults.map((v) => (v.id === input.id ? updated : v)),
                auditLogs: [audit, ...s.auditLogs],
              })),
            [{ table: 'cash_vaults', rows: [updated as unknown as Record<string, unknown>] }],
          );
          return res.ok ? { ok: true, id: input.id } : res;
        }
        const bank = state.banks.find((b) => b.id === input.id);
        if (!bank) return { ok: false, error: 'الحساب البنكي غير موجود.' };
        const updated = { ...bank, openingBalance: amount };
        const audit = makeAudit(
          state,
          'bank',
          input.id,
          'update',
          `ضبط رصيد افتتاحي — ${bank.bankName}: ${formatMoney(amount, { decimals: 0 })}${input.note ? ` (${input.note})` : ''}`,
        );
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              banks: s.banks.map((b) => (b.id === input.id ? updated : b)),
              auditLogs: [audit, ...s.auditLogs],
            })),
          [{ table: 'bank_accounts', rows: [updated as unknown as Record<string, unknown>] }],
        );
        return res.ok ? { ok: true, id: input.id } : res;
      },

      setSessionOpeningStock: async (input) => {
        const state = get();
        const gate = requireOpenSession(state);
        if (!gate.ok || !gate.session) return gate;
        const session = gate.session;
        if (input.quantity < 0) return { ok: false, error: 'الكمية لا يمكن أن تكون سالبة.' };
        if (input.unitCost <= 0) return { ok: false, error: 'أدخل تكلفة اللتر أكبر من صفر.' };

        const qty = round(input.quantity);
        const cost = round(input.unitCost, 3);
        const sorted = [...state.sessions].sort((a, b) => a.periodFrom.localeCompare(b.periodFrom));
        const earliest = sorted[0];
        const hasMovements =
          state.supplies.length + state.sales.length + state.adjustments.length > 0;
        const stockBefore = buildInventoryLedger(
          state.supplies,
          state.sales,
          state.adjustments,
          state.sessions,
        ).currentStock;

        const updatedSession = { ...session, openingStock: qty, openingAvgCost: cost };
        const ledgerOpeningOnly = session.id === earliest?.id && !hasMovements;
        let newAdj: InventoryAdjustment | null = null;
        if (!ledgerOpeningOnly) {
          const delta = round(qty - stockBefore);
          if (Math.abs(delta) > 0.001) {
            newAdj = {
              id: uid('adj-'),
              ref: nextRef('ADJ', state.adjustments),
              sessionId: session.id,
              date: `${session.periodFrom}T08:00:00.000Z`,
              quantity: delta,
              unitCost: cost,
              reason: input.note?.trim() || 'رصيد افتتاحي للدورة — متبقي من الدورة السابقة',
              createdAt: new Date().toISOString(),
            };
          }
        }

        const audit = makeAudit(
          state,
          'session',
          session.id,
          'update',
          `ضبط مخزون افتتاحي للدورة «${session.label}»: ${formatLiters(qty, 0, false)} بمتوسط ${formatPricePerLiter(cost, 3)}`,
        );
        const dbOps: { table: string; rows: Record<string, unknown>[] }[] = [
          { table: 'sessions', rows: [updatedSession as unknown as Record<string, unknown>] },
        ];
        if (newAdj) dbOps.push({ table: 'inventory_adjustments', rows: [newAdj as unknown as Record<string, unknown>] });

        const res = await mutateWithDb(
          () =>
            set((s) => ({
              sessions: s.sessions.map((x) => (x.id === session.id ? updatedSession : x)),
              adjustments: newAdj ? [newAdj, ...s.adjustments] : s.adjustments,
              auditLogs: [audit, ...s.auditLogs],
            })),
          dbOps,
        );
        return res.ok ? { ok: true, id: session.id } : res;
      },

      recordTransfer: async (input) => {
        const state = get();
        const gate = requireOpenSession(state);
        if (!gate.ok) return gate;
        if (input.amount <= 0) return { ok: false, error: 'المبلغ يجب أن يكون أكبر من صفر.' };
        if (input.fromType === input.toType && input.fromId === input.toId)
          return { ok: false, error: 'لا يمكن التحويل إلى نفس الحساب.' };
        const bal = accountBalance(input.fromType, input.fromId, state.vaults, state.banks, state.cashMovements);
        if (input.amount > bal + 0.001)
          return { ok: false, error: `الرصيد المتاح (${formatMoney(Math.floor(bal), { decimals: 0 })}) لا يكفي للتحويل.` };
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
        const audit = makeAudit(state, 'transfer', id, 'transfer', `تحويل ${formatMoney(amount, { decimals: 0 })} بين الحسابات`);
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              transfers: [transfer, ...s.transfers],
              cashMovements: [inn, out, ...s.cashMovements],
              auditLogs: [audit, ...s.auditLogs],
            })),
          [
            { table: 'cash_transfers', rows: [transfer as unknown as Record<string, unknown>] },
            { table: 'cash_movements', rows: [out, inn] as unknown as Record<string, unknown>[] },
          ],
        );
        return res.ok ? { ok: true, id } : res;
      },

      // ── v3.0: المصاريف ───────────────────────────────────
      recordExpense: async (input) => {
        const state = get();
        const gate = requireOpenSession(state);
        if (!gate.ok) return gate;
        if (input.amount <= 0) return { ok: false, error: 'المبلغ يجب أن يكون أكبر من صفر.' };
        const cat = state.expenseCategories.find((c) => c.id === input.categoryId);
        if (!cat) return { ok: false, error: 'التصنيف غير موجود.' };
        const bal = accountBalance(input.paidFromType, input.paidFromId, state.vaults, state.banks, state.cashMovements);
        if (input.amount > bal + 0.001)
          return { ok: false, error: `الرصيد المتاح (${formatMoney(Math.floor(bal), { decimals: 0 })}) لا يكفي لتسجيل المصروف.` };
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
        const audit = makeAudit(state, 'expense', id, 'create', `مصروف ${cat.name}: ${formatMoney(amount, { decimals: 0 })}`);
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              expenses: [expense, ...s.expenses],
              cashMovements: [cm, ...s.cashMovements],
              auditLogs: [audit, ...s.auditLogs],
            })),
          [
            { table: 'expenses', rows: [expense as unknown as Record<string, unknown>] },
            { table: 'cash_movements', rows: [cm as unknown as Record<string, unknown>] },
          ],
        );
        return res.ok ? { ok: true, id } : res;
      },

      updateExpense: async (id, patch) => {
        const state = get();
        const existing = state.expenses.find((e) => e.id === id);
        if (!existing) return { ok: false, error: 'المصروف غير موجود.' };
        const updated: Expense = {
          ...existing,
          ...patch,
          amount: patch.amount != null ? round(patch.amount) : existing.amount,
        };
        if (updated.amount <= 0) return { ok: false, error: 'المبلغ غير صالح.' };
        const cm = state.cashMovements.find((m) => m.referenceId === id && m.referenceType === 'expense');
        const updatedCm = cm
          ? { ...cm, amount: updated.amount, description: updated.description, date: updated.date }
          : null;
        const audit = makeAudit(state, 'expense', id, 'update', `تعديل مصروف ${existing.ref}`);
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              expenses: s.expenses.map((e) => (e.id === id ? updated : e)),
              cashMovements: updatedCm
                ? s.cashMovements.map((m) => (m.id === updatedCm.id ? updatedCm : m))
                : s.cashMovements,
              auditLogs: [audit, ...s.auditLogs],
            })),
          [
            { table: 'expenses', rows: [updated as unknown as Record<string, unknown>] },
            ...(updatedCm ? [{ table: 'cash_movements', rows: [updatedCm as unknown as Record<string, unknown>] }] : []),
          ],
        );
        return res.ok ? { ok: true, id } : res;
      },

      deleteExpense: async (id) => {
        const state = get();
        const existing = state.expenses.find((e) => e.id === id);
        if (!existing) return { ok: false, error: 'المصروف غير موجود.' };
        const cmIds = state.cashMovements.filter((m) => m.referenceId === id).map((m) => m.id);
        const audit = makeAudit(state, 'expense', id, 'delete', `حذف مصروف ${existing.ref}`);
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              expenses: s.expenses.filter((e) => e.id !== id),
              cashMovements: s.cashMovements.filter((m) => m.referenceId !== id),
              auditLogs: [audit, ...s.auditLogs],
            })),
          [
            { table: 'expenses', deletes: [id] },
            ...(cmIds.length ? [{ table: 'cash_movements', deletes: cmIds }] : []),
          ],
        );
        return res.ok ? { ok: true, id } : res;
      },

      addExpenseCategory: async (input) => {
        const cat: ExpenseCategory = {
          id: uid('cat-'),
          name: input.name.trim(),
          group: input.group,
          budgetMonthly: input.budgetMonthly,
          isRecurring: input.isRecurring ?? false,
        };
        if (!cat.name) return { ok: false, error: 'أدخل اسم التصنيف.' };
        const res = await mutateWithDb(
          () => set((s) => ({ expenseCategories: [...s.expenseCategories, cat] })),
          [{ table: 'expense_categories', rows: [cat as unknown as Record<string, unknown>] }],
        );
        return res.ok ? { ok: true, id: cat.id } : res;
      },

      updateExpenseCategory: async (id, patch) => {
        const state = get();
        const existing = state.expenseCategories.find((c) => c.id === id);
        if (!existing) return { ok: false, error: 'التصنيف غير موجود.' };
        const updated = { ...existing, ...patch };
        const res = await mutateWithDb(
          () => set((s) => ({ expenseCategories: s.expenseCategories.map((c) => (c.id === id ? updated : c)) })),
          [{ table: 'expense_categories', rows: [updated as unknown as Record<string, unknown>] }],
        );
        return res.ok ? { ok: true, id } : res;
      },

      deleteExpenseCategory: async (id) => {
        const state = get();
        if (state.expenses.some((e) => e.categoryId === id))
          return { ok: false, error: 'لا يمكن حذف تصنيف مرتبط بمصاريف.' };
        const res = await mutateWithDb(
          () => set((s) => ({ expenseCategories: s.expenseCategories.filter((c) => c.id !== id) })),
          [{ table: 'expense_categories', deletes: [id] }],
        );
        return res.ok ? { ok: true, id } : res;
      },

      recordExternalIncome: async (input) => {
        const state = get();
        const gate = requireOpenSession(state);
        if (!gate.ok) return gate;
        if (input.amount <= 0) return { ok: false, error: 'المبلغ يجب أن يكون أكبر من صفر.' };
        if (!input.description.trim()) return { ok: false, error: 'أدخل وصف المدخول.' };
        const date = input.date ?? new Date().toISOString();
        const id = uid('inc-');
        const amount = round(input.amount);
        const income: ExternalIncome = {
          id,
          ref: nextRef('INC', state.externalIncomes),
          sessionId: state.activeSessionId,
          date: date.slice(0, 10),
          amount,
          description: input.description.trim(),
          destinationType: input.destinationType,
          destinationId: input.destinationId,
          createdAt: new Date().toISOString(),
          createdBy: state.auth?.name,
        };
        const cm: CashMovement = {
          id: uid('cm-'),
          ref: nextRef('CM', state.cashMovements),
          movementType: 'income',
          sourceType: input.destinationType,
          sourceId: input.destinationId,
          amount,
          direction: 'in',
          referenceType: 'external_income',
          referenceId: id,
          description: input.description.trim(),
          sessionId: state.activeSessionId,
          date,
          createdAt: new Date().toISOString(),
          createdBy: state.auth?.name,
        };
        const audit = makeAudit(state, 'income', id, 'create', `مدخول خارجي: ${formatMoney(amount, { decimals: 0 })}`);
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              externalIncomes: [income, ...s.externalIncomes],
              cashMovements: [cm, ...s.cashMovements],
              auditLogs: [audit, ...s.auditLogs],
            })),
          [
            { table: 'external_incomes', rows: [income as unknown as Record<string, unknown>] },
            { table: 'cash_movements', rows: [cm as unknown as Record<string, unknown>] },
          ],
        );
        return res.ok ? { ok: true, id } : res;
      },

      updateExternalIncome: async (id, patch) => {
        const state = get();
        const existing = state.externalIncomes.find((i) => i.id === id);
        if (!existing) return { ok: false, error: 'المدخول غير موجود.' };
        const updated: ExternalIncome = {
          ...existing,
          ...patch,
          amount: patch.amount != null ? round(patch.amount) : existing.amount,
          date: patch.date ? patch.date.slice(0, 10) : existing.date,
          description: patch.description?.trim() ?? existing.description,
        };
        const cm = state.cashMovements.find((m) => m.referenceId === id && m.referenceType === 'external_income');
        const updatedCm = cm ? { ...cm, amount: updated.amount, description: updated.description, date: updated.date } : null;
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              externalIncomes: s.externalIncomes.map((i) => (i.id === id ? updated : i)),
              cashMovements: updatedCm
                ? s.cashMovements.map((m) => (m.id === updatedCm.id ? updatedCm : m))
                : s.cashMovements,
            })),
          [
            { table: 'external_incomes', rows: [updated as unknown as Record<string, unknown>] },
            ...(updatedCm ? [{ table: 'cash_movements', rows: [updatedCm as unknown as Record<string, unknown>] }] : []),
          ],
        );
        return res.ok ? { ok: true, id } : res;
      },

      deleteExternalIncome: async (id) => {
        const state = get();
        const existing = state.externalIncomes.find((i) => i.id === id);
        if (!existing) return { ok: false, error: 'المدخول غير موجود.' };
        const cmIds = state.cashMovements.filter((m) => m.referenceId === id).map((m) => m.id);
        const audit = makeAudit(state, 'income', id, 'delete', `حذف مدخول ${existing.ref}`);
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              externalIncomes: s.externalIncomes.filter((i) => i.id !== id),
              cashMovements: s.cashMovements.filter((m) => m.referenceId !== id),
              auditLogs: [audit, ...s.auditLogs],
            })),
          [
            { table: 'external_incomes', deletes: [id] },
            ...(cmIds.length ? [{ table: 'cash_movements', deletes: cmIds }] : []),
          ],
        );
        return res.ok ? { ok: true, id } : res;
      },

      // ── v3.0: الموظفون والرواتب ──────────────────────────
      addEmployee: async (input) => {
        const state = get();
        const code = nextPartyCode('E', state.employees);
        const emp: Employee = {
          ...input,
          id: uid('emp-'),
          code,
          hireDate: input.hireDate?.slice(0, 10),
          createdAt: new Date().toISOString(),
        };
        const audit = makeAudit(state, 'employee', emp.id, 'create', `إضافة موظف: ${emp.fullName}`);
        if (isSupabaseConfigured()) {
          try {
            const { persistMutation } = await import('@/lib/supabase/live-db');
            await persistMutation(
              [{ table: 'employees', rows: [emp as unknown as Record<string, unknown>] }],
              () =>
                set((s) => ({
                  employees: [emp, ...s.employees],
                  auditLogs: [audit, ...s.auditLogs],
                })),
            );
          } catch (e) {
            return { ok: false, error: e instanceof Error ? e.message : 'فشل حفظ الموظف' };
          }
          return { ok: true, id: emp.id };
        }
        set({
          employees: [emp, ...state.employees],
          auditLogs: [audit, ...state.auditLogs],
        });
        return { ok: true, id: emp.id };
      },
      updateEmployee: async (id, patch) => {
        const state = get();
        const existing = state.employees.find((e) => e.id === id);
        if (!existing) return { ok: false, error: 'الموظف غير موجود.' };
        const updated: Employee = {
          ...existing,
          ...patch,
          hireDate: patch.hireDate != null ? patch.hireDate.slice(0, 10) : existing.hireDate,
        };
        const audit = makeAudit(state, 'employee', id, 'update', 'تعديل بيانات موظف');
        if (isSupabaseConfigured()) {
          try {
            const { persistMutation } = await import('@/lib/supabase/live-db');
            await persistMutation(
              [{ table: 'employees', rows: [updated as unknown as Record<string, unknown>] }],
              () =>
                set((s) => ({
                  employees: s.employees.map((e) => (e.id === id ? updated : e)),
                  auditLogs: [audit, ...s.auditLogs],
                })),
            );
          } catch (e) {
            return { ok: false, error: e instanceof Error ? e.message : 'فشل تحديث الموظف' };
          }
          return { ok: true, id };
        }
        set((s) => ({
          employees: s.employees.map((e) => (e.id === id ? updated : e)),
          auditLogs: [audit, ...s.auditLogs],
        }));
        return { ok: true, id };
      },

      deleteEmployee: async (id) => {
        const state = get();
        const existing = state.employees.find((e) => e.id === id);
        if (!existing) return { ok: false, error: 'الموظف غير موجود.' };
        const block = employeeDeleteBlock(state, id);
        if (block) return { ok: false, error: block };
        const audit = makeAudit(state, 'employee', id, 'delete', `حذف موظف: ${existing.fullName}`);
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              employees: s.employees.filter((e) => e.id !== id),
              auditLogs: [audit, ...s.auditLogs],
            })),
          [{ table: 'employees', deletes: [id] }],
        );
        return res.ok ? { ok: true, id } : res;
      },

      createPayrollBatch: async (input) => {
        const state = get();
        const gate = requireOpenSession(state);
        if (!gate.ok) return gate;
        const active = state.employees.filter((e) => e.status === 'active');
        if (!active.length) return { ok: false, error: 'لا يوجد موظفون نشطون لإنشاء كشف رواتب.' };
        const lines: PayrollLine[] = active.map((e) => {
          const allowancesTotal = e.allowances.housing + e.allowances.transport + e.allowances.food;
          const gross = round(e.baseSalary + allowancesTotal);
          const advanceBal = computeEmployeeAdvanceBalance(e.id, state.payments, state.payrollBatches, state.debtEntries);
          const advanceDeducted = round(Math.min(advanceBal, gross));
          const deductionsTotal = advanceDeducted;
          const netSalary = round(gross - advanceDeducted);
          return {
            employeeId: e.id,
            baseSalary: e.baseSalary,
            allowancesTotal,
            deductionsTotal,
            netSalary,
            attendanceDays: 30,
            absenceDays: 0,
            advanceDeducted,
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
        const audit = makeAudit(state, 'payroll', id, 'create', `إنشاء كشف رواتب: ${input.label}`);
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              payrollBatches: [batch, ...s.payrollBatches],
              auditLogs: [audit, ...s.auditLogs],
            })),
          [{ table: 'payroll_batches', rows: [batch as unknown as Record<string, unknown>] }],
        );
        return res.ok ? { ok: true, id } : res;
      },

      payPayrollBatch: async (batchId, source) => {
        const state = get();
        const gate = requireOpenSession(state);
        if (!gate.ok) return gate;
        const batch = state.payrollBatches.find((b) => b.id === batchId);
        if (!batch) return { ok: false, error: 'كشف الرواتب غير موجود.' };
        if (batch.status === 'paid') return { ok: false, error: 'الكشف مصروف بالفعل.' };
        const bal = accountBalance(source.type, source.id, state.vaults, state.banks, state.cashMovements);
        if (batch.totalAmount > bal + 0.001)
          return { ok: false, error: `الرصيد المتاح (${formatMoney(Math.floor(bal), { decimals: 0 })}) لا يكفي لصرف الرواتب.` };
        const date = new Date().toISOString();
        const updatedBatch: PayrollBatch = {
          ...batch,
          status: 'paid',
          paidFromType: source.type,
          paidFromId: source.id,
          paidAt: date,
        };
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
        const audit = makeAudit(state, 'payroll', batchId, 'pay', `صرف رواتب ${formatMoney(batch.totalAmount, { decimals: 0 })}`);
        const res = await mutateWithDb(
          () =>
            set((s) => ({
              payrollBatches: s.payrollBatches.map((b) => (b.id === batchId ? updatedBatch : b)),
              cashMovements: [cm, ...s.cashMovements],
              auditLogs: [audit, ...s.auditLogs],
            })),
          [
            { table: 'payroll_batches', rows: [updatedBatch as unknown as Record<string, unknown>] },
            { table: 'cash_movements', rows: [cm as unknown as Record<string, unknown>] },
          ],
        );
        return res.ok ? { ok: true, id: batchId } : res;
      },

      updateSettings: async (patch) => {
        const state = get();
        const settings = { ...state.settings, ...patch };
        if (isSupabaseConfigured()) {
          try {
            const { applyLocalDbWrite } = await import('@/lib/supabase/live-db');
            const { persistAppSettings } = await import('@/lib/supabase/repository');
            await persistAppSettings({ activeSessionId: state.activeSessionId, settings });
            applyLocalDbWrite(() => set({ settings }));
          } catch (e) {
            return { ok: false, error: e instanceof Error ? e.message : 'فشل حفظ الإعدادات' };
          }
          return { ok: true };
        }
        set({ settings });
        return { ok: true };
      },

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
          debtEntries: [],
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
          externalIncomes: [],
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
          debtEntries: [],
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
          externalIncomes: [],
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
          if (!Array.isArray(next.expenseCategories) || !(next.expenseCategories as ExpenseCategory[]).length) {
            next.expenseCategories = DEFAULT_EXPENSE_CATEGORIES;
          }
          return next as Partial<ErpState>;
        }),
}));
