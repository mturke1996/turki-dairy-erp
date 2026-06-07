/**
 * طبقة الوصول للبيانات في Supabase — سحب/دفع كامل الحالة.
 *
 * • pullAll: يقرأ كل الجداول ويعيد لقطة كاملة بصيغة التطبيق.
 * • pushAll: upsert + حذف السجلات اليتيمة + كشف التعارض عبر sync_version.
 * • testConnection: فحص سريع للاتصال (يتطلب جلسة authenticated عند RLS المقيّد).
 */

import { createClient } from '@/lib/client';
import { isCloudSyncAvailable } from '@/lib/supabase/config';
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

export interface PullResult extends ErpSnapshot {
  syncVersion: number;
}

export class SyncConflictError extends Error {
  readonly remoteVersion: number;
  readonly localVersion: number;

  constructor(remoteVersion: number, localVersion: number) {
    super(`تعارض مزامنة: السحابة v${remoteVersion} > المحلي v${localVersion}. سيتم السحب أولاً.`);
    this.name = 'SyncConflictError';
    this.remoteVersion = remoteVersion;
    this.localVersion = localVersion;
  }
}

type Sb = ReturnType<typeof createClient>;

/** جداول ERP بترتيب الاعتماد (الآباء قبل الأبناء). */
const SYNC_TABLES = [
  { table: 'sessions', key: 'sessions' as const },
  { table: 'farmers', key: 'farmers' as const },
  { table: 'customers', key: 'customers' as const },
  { table: 'cash_vaults', key: 'vaults' as const },
  { table: 'bank_accounts', key: 'banks' as const },
  { table: 'expense_categories', key: 'expenseCategories' as const },
  { table: 'supplies', key: 'supplies' as const },
  { table: 'sales', key: 'sales' as const },
  { table: 'payments', key: 'payments' as const },
  { table: 'inventory_adjustments', key: 'adjustments' as const },
  { table: 'cash_movements', key: 'cashMovements' as const },
  { table: 'cash_transfers', key: 'transfers' as const },
  { table: 'expenses', key: 'expenses' as const },
  { table: 'employees', key: 'employees' as const },
  { table: 'payroll_batches', key: 'payrollBatches' as const },
  { table: 'audit_logs', key: 'auditLogs' as const },
] as const;

const SYNC_VERSION_KEY = 'turki-sync-remote-version';
const DEVICE_ID_KEY = 'turki-sync-device-id';

export function isSupabaseConfigured(): boolean {
  return isCloudSyncAvailable();
}

function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getLocalSyncVersion(): number {
  if (typeof window === 'undefined') return 0;
  return Number(window.localStorage.getItem(SYNC_VERSION_KEY) ?? 0);
}

export function setLocalSyncVersion(v: number): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SYNC_VERSION_KEY, String(v));
}

export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const sb = createClient();
    const { data: authData } = await sb.auth.getSession();
    if (!authData.session) {
      return { ok: false, error: 'يجب تسجيل الدخول لتفعيل المزامنة السحابية.' };
    }
    const { error } = await sb.from('app_settings').select('id').eq('id', 'singleton').limit(1);
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

async function selectIds(sb: Sb, table: string): Promise<string[]> {
  const { data, error } = await sb.from(table).select('id');
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []).map((r) => (r as { id: string }).id);
}

async function upsert(sb: Sb, table: string, rows: Record<string, unknown>[]): Promise<void> {
  if (!rows.length) return;
  const { error } = await sb.from(table).upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function pruneOrphans(sb: Sb, table: string, localIds: string[]): Promise<void> {
  const remoteIds = await selectIds(sb, table);
  const orphans = remoteIds.filter((id) => !localIds.includes(id));
  if (!orphans.length) return;
  const { error } = await sb.from(table).delete().in('id', orphans);
  if (error) throw new Error(`${table} delete: ${error.message}`);
}

const mapRows = (items: Record<string, unknown>[]) => items.map((i) => toRow(i));

export async function pullAll(): Promise<PullResult> {
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

  let settings: Partial<AppSettings> | undefined;
  let activeSessionId: string | null = null;
  let syncVersion = 0;

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
    syncVersion = Number(s.syncVersion ?? 0);
  }

  if (!activeSessionId && sessions.length) {
    activeSessionId = (sessions.find((x) => x.status === 'open') ?? sessions[0]).id;
  }

  setLocalSyncVersion(syncVersion);

  return {
    sessions, activeSessionId, farmers, customers, supplies, sales, payments, adjustments,
    vaults, banks, cashMovements, transfers, expenseCategories, expenses,
    employees, payrollBatches, auditLogs, settings, syncVersion,
  };
}

/** يرفع كامل الحالة — مع حذف اليتيمة وكشف التعارض. */
export async function pushAll(state: ErpSnapshot, opts?: { skipConflictCheck?: boolean }): Promise<number> {
  const sb = createClient();
  const localVersion = getLocalSyncVersion();

  const { data: remoteSettings } = await sb
    .from('app_settings')
    .select('sync_version')
    .eq('id', 'singleton')
    .maybeSingle();

  const remoteVersion = Number(remoteSettings?.sync_version ?? 0);

  if (!opts?.skipConflictCheck && remoteVersion > localVersion) {
    throw new SyncConflictError(remoteVersion, localVersion);
  }

  const nextVersion = remoteVersion + 1;

  for (const { table, key } of SYNC_TABLES) {
    const items = state[key] as { id: string }[];
    await upsert(sb, table, mapRows(items as unknown as Record<string, unknown>[]));
  }

  // حذف اليتيمة: الأبناء أولاً احتراماً للمفاتيح الأجنبية
  for (const { table, key } of [...SYNC_TABLES].reverse()) {
    const items = state[key] as { id: string }[];
    const localIds = items.map((i) => i.id);
    await pruneOrphans(sb, table, localIds);
  }

  const settingsRow = toRow((state.settings ?? {}) as Record<string, unknown>);
  const { error: settingsError } = await sb.from('app_settings').upsert(
    {
      id: 'singleton',
      ...settingsRow,
      active_session_id: state.activeSessionId,
      sync_version: nextVersion,
      sync_device_id: getDeviceId(),
      sync_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  if (settingsError) throw new Error(`app_settings: ${settingsError.message}`);

  setLocalSyncVersion(nextVersion);
  return nextVersion;
}
