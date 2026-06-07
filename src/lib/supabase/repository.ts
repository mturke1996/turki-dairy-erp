/**
 * طبقة الوصول للبيانات في Supabase — سحب/دفع كامل الحالة.
 *
 * • pullAll: يقرأ كل الجداول ويعيد لقطة كاملة بصيغة التطبيق.
 * • pushAll: يرفع كامل الحالة (upsert) بترتيب يحترم المفاتيح الأجنبية.
 * • testConnection: فحص سريع للاتصال.
 */

import { createClient } from '@/lib/client';
import type {
  AuditLog, BankAccount, CashMovement, CashTransfer, CashVault, Customer, Employee,
  Expense, ExpenseCategory, Farmer, InventoryAdjustment, Payment, PayrollBatch,
  SaleTransaction, Session, SupplyTransaction, AppSettings,
} from '@/lib/domain/types';
import { fromRow, rowsFrom, toRow } from './mappers';

export interface ErpSnapshot {
  sessions: Session[];
  activeSessionId: string | null;
  farmers: Farmer[];
  customers: Customer[];
  supplies: SupplyTransaction[];
  sales: SaleTransaction[];
  payments: Payment[];
  adjustments: InventoryAdjustment[];
  vaults: CashVault[];
  banks: BankAccount[];
  cashMovements: CashMovement[];
  transfers: CashTransfer[];
  expenseCategories: ExpenseCategory[];
  expenses: Expense[];
  employees: Employee[];
  payrollBatches: PayrollBatch[];
  auditLogs: AuditLog[];
  settings?: Partial<AppSettings>;
}

type Sb = ReturnType<typeof createClient>;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await createClient().from('sessions').select('id').limit(1);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'تعذّر الاتصال' };
  }
}

async function select<T>(sb: Sb, table: string): Promise<T[]> {
  const { data, error } = await sb.from(table).select('*');
  if (error) throw new Error(`${table}: ${error.message}`);
  return rowsFrom<T>(data as Record<string, unknown>[] | null);
}

export async function pullAll(): Promise<ErpSnapshot> {
  const sb = createClient();
  const [
    sessions, farmers, customers, supplies, sales, payments, adjustments,
    vaults, banks, cashMovements, transfers, expenseCategories, expenses,
    employees, payrollBatches, auditLogs,
  ] = await Promise.all([
    select<Session>(sb, 'sessions'),
    select<Farmer>(sb, 'farmers'),
    select<Customer>(sb, 'customers'),
    select<SupplyTransaction>(sb, 'supplies'),
    select<SaleTransaction>(sb, 'sales'),
    select<Payment>(sb, 'payments'),
    select<InventoryAdjustment>(sb, 'inventory_adjustments'),
    select<CashVault>(sb, 'cash_vaults'),
    select<BankAccount>(sb, 'bank_accounts'),
    select<CashMovement>(sb, 'cash_movements'),
    select<CashTransfer>(sb, 'cash_transfers'),
    select<ExpenseCategory>(sb, 'expense_categories'),
    select<Expense>(sb, 'expenses'),
    select<Employee>(sb, 'employees'),
    select<PayrollBatch>(sb, 'payroll_batches'),
    select<AuditLog>(sb, 'audit_logs'),
  ]);

  // إعدادات التطبيق + الدورة النشطة (صف مفرد)
  let settings: Partial<AppSettings> | undefined;
  let activeSessionId: string | null = null;
  const { data: settingsRow } = await sb.from('app_settings').select('*').eq('id', 'singleton').maybeSingle();
  if (settingsRow) {
    const s = fromRow<Record<string, unknown>>(settingsRow as Record<string, unknown>);
    settings = {
      minStockThreshold: s.minStockThreshold as number,
      defaultBuyPrice: s.defaultBuyPrice as number,
      defaultSellPrice: s.defaultSellPrice as number,
      currencyLabel: s.currencyLabel as string,
    };
    activeSessionId = (s.activeSessionId as string) ?? null;
  }

  // إن لم تُحفظ الدورة النشطة، اختر أول دورة مفتوحة
  if (!activeSessionId && sessions.length) {
    activeSessionId = (sessions.find((x) => x.status === 'open') ?? sessions[0]).id;
  }

  return {
    sessions, activeSessionId, farmers, customers, supplies, sales, payments, adjustments,
    vaults, banks, cashMovements, transfers, expenseCategories, expenses,
    employees, payrollBatches, auditLogs, settings,
  };
}

async function upsert(sb: Sb, table: string, rows: Record<string, unknown>[]): Promise<void> {
  if (!rows.length) return;
  const { error } = await sb.from(table).upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`${table}: ${error.message}`);
}

const mapRows = (items: Record<string, unknown>[]) => items.map((i) => toRow(i));

/** يرفع كامل الحالة الحالية إلى Supabase. الترتيب يحترم المفاتيح الأجنبية. */
export async function pushAll(state: ErpSnapshot): Promise<void> {
  const sb = createClient();

  // الآباء أولاً
  await upsert(sb, 'sessions', mapRows(state.sessions as unknown as Record<string, unknown>[]));
  await upsert(sb, 'farmers', mapRows(state.farmers as unknown as Record<string, unknown>[]));
  await upsert(sb, 'customers', mapRows(state.customers as unknown as Record<string, unknown>[]));
  await upsert(sb, 'cash_vaults', mapRows(state.vaults as unknown as Record<string, unknown>[]));
  await upsert(sb, 'bank_accounts', mapRows(state.banks as unknown as Record<string, unknown>[]));
  await upsert(sb, 'expense_categories', mapRows(state.expenseCategories as unknown as Record<string, unknown>[]));

  // الأبناء
  await upsert(sb, 'supplies', mapRows(state.supplies as unknown as Record<string, unknown>[]));
  await upsert(sb, 'sales', mapRows(state.sales as unknown as Record<string, unknown>[]));
  await upsert(sb, 'payments', mapRows(state.payments as unknown as Record<string, unknown>[]));
  await upsert(sb, 'inventory_adjustments', mapRows(state.adjustments as unknown as Record<string, unknown>[]));
  await upsert(sb, 'cash_movements', mapRows(state.cashMovements as unknown as Record<string, unknown>[]));
  await upsert(sb, 'cash_transfers', mapRows(state.transfers as unknown as Record<string, unknown>[]));
  await upsert(sb, 'expenses', mapRows(state.expenses as unknown as Record<string, unknown>[]));
  await upsert(sb, 'employees', mapRows(state.employees as unknown as Record<string, unknown>[]));
  await upsert(sb, 'payroll_batches', mapRows(state.payrollBatches as unknown as Record<string, unknown>[]));
  await upsert(sb, 'audit_logs', mapRows(state.auditLogs as unknown as Record<string, unknown>[]));

  // الإعدادات + الدورة النشطة
  if (state.settings) {
    const row = toRow(state.settings as Record<string, unknown>);
    await sb.from('app_settings').upsert(
      { id: 'singleton', ...row, active_session_id: state.activeSessionId, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    );
  }
}
