'use client';

/**
 * اتصال مباشر بـ PostgreSQL — بدون «مزامنة» أو لقطات كاملة.
 * • تحميل أولي من القاعدة
 * • حفظ فوري للصفوف المتغيّرة فقط
 * • Realtime لتحديثات الأجهزة الأخرى
 */

import { create } from 'zustand';
import { createClient } from '@/lib/client';
import { useErpStore } from '@/lib/store/use-erp-store';
import { fromRow } from './mappers';
import {
  bootstrapDatabase,
  deleteRows,
  ERP_TABLES,
  isSupabaseConfigured,
  persistAppSettings,
  pullAll,
  testConnection,
  upsertRows,
  type ErpSnapshot,
} from './repository';

export type DbStatus = 'idle' | 'loading' | 'saving' | 'error' | 'offline' | 'unconfigured';
export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected';

interface DbState {
  status: DbStatus;
  realtimeStatus: RealtimeStatus;
  lastSavedAt: string | null;
  lastError: string | null;
}

export const useDbStore = create<DbState>(() => ({
  status: isSupabaseConfigured() ? 'idle' : 'unconfigured',
  realtimeStatus: 'disconnected',
  lastSavedAt: null,
  lastError: null,
}));

/** @deprecated — استخدم useDbStore */
export const useSyncStore = useDbStore;

function snapshotFromStore(): ErpSnapshot {
  const s = useErpStore.getState();
  return {
    sessions: s.sessions,
    activeSessionId: s.activeSessionId,
    farmers: s.farmers,
    customers: s.customers,
    supplies: s.supplies,
    sales: s.sales,
    payments: s.payments,
    debtEntries: s.debtEntries,
    adjustments: s.adjustments,
    vaults: s.vaults,
    banks: s.banks,
    cashMovements: s.cashMovements,
    transfers: s.transfers,
    expenseCategories: s.expenseCategories,
    expenses: s.expenses,
    employees: s.employees,
    payrollBatches: s.payrollBatches,
    auditLogs: s.auditLogs,
    settings: s.settings,
  };
}

let applyingRemote = false;
let prevSnapshot: ErpSnapshot | null = null;
let writeChain: Promise<void> = Promise.resolve();
let unsubscribe: (() => void) | null = null;
let realtimeCleanup: (() => void) | null = null;
let visibilityCleanup: (() => void) | null = null;
let initPromise: Promise<{ ok: boolean; error?: string }> | null = null;
let lastFallbackPull = 0;

type TableKey = (typeof ERP_TABLES)[number]['key'];

const TABLE_BY_NAME = Object.fromEntries(ERP_TABLES.map((t) => [t.table, t.key])) as Record<string, TableKey>;

/** جداول لا يُحذف منها تلقائياً — الحذف يدوي فقط */
const NO_AUTO_DELETE_TABLES = new Set([
  'sessions',
  'farmers',
  'customers',
  'cash_vaults',
  'bank_accounts',
  'expense_categories',
  'employees',
  'debt_entries',
]);

function rowJson<T extends { id: string }>(row: T): string {
  return JSON.stringify(row);
}

function diffArray<T extends { id: string }>(prev: T[], next: T[]): { upserts: T[]; deletes: string[] } {
  const prevMap = new Map(prev.map((r) => [r.id, rowJson(r)]));
  const nextIds = new Set(next.map((r) => r.id));
  const upserts: T[] = [];
  for (const row of next) {
    const old = prevMap.get(row.id);
    if (!old || old !== rowJson(row)) upserts.push(row);
  }
  const deletes = prev.filter((r) => !nextIds.has(r.id)).map((r) => r.id);
  return { upserts, deletes };
}

function diffSnapshots(prev: ErpSnapshot, next: ErpSnapshot) {
  const ops: { table: string; upserts: Record<string, unknown>[]; deletes: string[] }[] = [];
  for (const { table, key } of ERP_TABLES) {
    const { upserts, deletes } = diffArray(
      (prev[key] ?? []) as { id: string }[],
      (next[key] ?? []) as { id: string }[],
    );
    const safeDeletes = NO_AUTO_DELETE_TABLES.has(table) ? [] : deletes;
    if (upserts.length || safeDeletes.length) {
      ops.push({ table, upserts: upserts as Record<string, unknown>[], deletes: safeDeletes });
    }
  }
  const settingsChanged =
    prev.activeSessionId !== next.activeSessionId ||
    JSON.stringify(prev.settings) !== JSON.stringify(next.settings);
  return { ops, settingsChanged };
}

async function applyWriteOps(ops: ReturnType<typeof diffSnapshots>['ops'], settingsChanged: boolean, next: ErpSnapshot) {
  useDbStore.setState({ status: 'saving', lastError: null });
  try {
    for (const op of ops) {
      if (op.upserts.length) await upsertRows(op.table, op.upserts);
      if (op.deletes.length) await deleteRows(op.table, op.deletes);
    }
    if (settingsChanged) await persistAppSettings(next);
    useDbStore.setState({ status: 'idle', lastSavedAt: new Date().toISOString(), lastError: null });
  } catch (e) {
    const error = e instanceof Error ? e.message : 'فشل الحفظ في قاعدة البيانات';
    useDbStore.setState({ status: 'error', lastError: error });
    throw e;
  }
}

function enqueuePersist(next: ErpSnapshot) {
  if (!isSupabaseConfigured() || applyingRemote) return;
  const prev = prevSnapshot;
  if (!prev) {
    prevSnapshot = next;
    return;
  }
  const { ops, settingsChanged } = diffSnapshots(prev, next);
  prevSnapshot = next;
  if (!ops.length && !settingsChanged) return;

  writeChain = writeChain
    .then(() => applyWriteOps(ops, settingsChanged, next))
    .catch((e) => {
      const error = e instanceof Error ? e.message : 'فشل الحفظ في قاعدة البيانات';
      useDbStore.setState({ status: 'error', lastError: error });
    });
}

function applyRemote(data: ErpSnapshot) {
  applyingRemote = true;
  useErpStore.getState().replaceAll(data);
  applyingRemote = false;
  prevSnapshot = data;
}

function mergeRemoteRow(table: string, payload: Record<string, unknown> | null, eventType: string, oldPayload?: Record<string, unknown> | null) {
  const key = TABLE_BY_NAME[table];
  if (!key) return;

  applyingRemote = true;
  useErpStore.setState((s) => {
    const list = [...((s[key] as { id: string }[]) ?? [])];
    if (eventType === 'DELETE') {
      if (NO_AUTO_DELETE_TABLES.has(table)) return s;
      const id = (oldPayload?.id ?? payload?.id) as string | undefined;
      if (!id) return s;
      return { [key]: list.filter((r) => r.id !== id) } as Partial<typeof s>;
    }
    if (!payload) return s;
    const row = fromRow<Record<string, unknown>>(payload) as { id: string };
    const idx = list.findIndex((r) => r.id === row.id);
    if (idx >= 0) list[idx] = row as (typeof list)[number];
    else list.unshift(row as (typeof list)[number]);
    return { [key]: list } as Partial<typeof s>;
  });
  applyingRemote = false;
  prevSnapshot = snapshotFromStore();
}

function startAutoPersist() {
  if (unsubscribe) return;
  unsubscribe = useErpStore.subscribe(() => {
    if (applyingRemote) return;
    enqueuePersist(snapshotFromStore());
  });
}

function teardownRealtime() {
  if (realtimeCleanup) {
    realtimeCleanup();
    realtimeCleanup = null;
  }
  if (visibilityCleanup) {
    visibilityCleanup();
    visibilityCleanup = null;
  }
}

async function maybeRefreshOnFocus() {
  if (!isSupabaseConfigured()) return;
  if (useDbStore.getState().realtimeStatus === 'connected') return;
  if (Date.now() - lastFallbackPull < 12_000) return;
  lastFallbackPull = Date.now();
  await loadDatabase();
}

function startRealtime() {
  if (typeof window === 'undefined') return;
  teardownRealtime();

  useDbStore.setState({ realtimeStatus: 'connecting' });
  const sb = createClient();
  const channel = sb.channel('erp-live', { config: { broadcast: { self: false } } });

  for (const { table } of ERP_TABLES) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload) => {
        mergeRemoteRow(
          table,
          payload.new as Record<string, unknown> | null,
          payload.eventType,
          payload.old as Record<string, unknown> | null,
        );
      },
    );
  }

  channel.on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'app_settings', filter: 'id=eq.singleton' },
    (payload) => {
      if (!payload.new) return;
      const row = fromRow<Record<string, unknown>>(payload.new as Record<string, unknown>);
      applyingRemote = true;
      useErpStore.setState({
        activeSessionId: (row.activeSessionId as string) ?? useErpStore.getState().activeSessionId,
        settings: {
          ...useErpStore.getState().settings,
          ...(row.minStockThreshold != null ? { minStockThreshold: row.minStockThreshold as number } : {}),
          ...(row.defaultBuyPrice != null ? { defaultBuyPrice: row.defaultBuyPrice as number } : {}),
          ...(row.defaultSellPrice != null ? { defaultSellPrice: row.defaultSellPrice as number } : {}),
          ...(row.currencyLabel != null ? { currencyLabel: row.currencyLabel as string } : {}),
        },
      });
      applyingRemote = false;
      prevSnapshot = snapshotFromStore();
    },
  );

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      useDbStore.setState({ realtimeStatus: 'connected' });
      return;
    }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      useDbStore.setState({ realtimeStatus: 'disconnected' });
    }
  });

  realtimeCleanup = () => {
    void sb.removeChannel(channel);
  };

  const onVisibility = () => {
    if (document.visibilityState !== 'visible') return;
    if (useDbStore.getState().realtimeStatus !== 'connected') {
      startRealtime();
      void maybeRefreshOnFocus();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  visibilityCleanup = () => document.removeEventListener('visibilitychange', onVisibility);
}

export function stopDatabase() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  teardownRealtime();
  prevSnapshot = null;
  initPromise = null;
}

/** تحميل البيانات من PostgreSQL وتفعيل الحفظ الفوري */
export async function initDatabase(): Promise<{ ok: boolean; error?: string }> {
  if (initPromise) {
    const existing = await initPromise;
    if (existing.ok) return existing;
    initPromise = null;
  }

  initPromise = (async () => {
    if (!isSupabaseConfigured()) {
      useDbStore.setState({ status: 'unconfigured', lastError: 'Supabase غير مهيّأ' });
      return { ok: false as const, error: 'Supabase غير مهيّأ' };
    }

    const probe = await testConnection();
    if (!probe.ok) {
      useDbStore.setState({ status: 'offline', lastError: probe.error ?? null });
      return { ok: false as const, error: probe.error };
    }

    const loaded = await loadDatabase();
    if (!loaded.ok) return loaded;

    startAutoPersist();
    if (useDbStore.getState().realtimeStatus !== 'connected') {
      startRealtime();
    }
    return { ok: true as const };
  })();

  try {
    const result = await initPromise;
    if (!result.ok) initPromise = null;
    return result;
  } catch (e) {
    initPromise = null;
    const error = e instanceof Error ? e.message : 'فشل تهيئة قاعدة البيانات';
    return { ok: false, error };
  }
}

export async function loadDatabase(): Promise<{ ok: boolean; error?: string }> {
  useDbStore.setState({ status: 'loading', lastError: null });
  try {
    const data = await pullAll();

    if (!data.sessions?.length) {
      const local = snapshotFromStore();
      await bootstrapDatabase(local);
      prevSnapshot = local;
      useDbStore.setState({ status: 'idle', lastSavedAt: new Date().toISOString(), lastError: null });
      return { ok: true };
    }

    applyRemote(data);
    useDbStore.setState({ status: 'idle', lastSavedAt: new Date().toISOString(), lastError: null });
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'فشل تحميل البيانات';
    useDbStore.setState({ status: 'error', lastError: error });
    return { ok: false, error };
  }
}

/** حفظ صفوف فوراً (قبل تحديث الواجهة) — للعمليات الحساسة */
export async function persistRowsNow(table: string, rows: Record<string, unknown>[]): Promise<void> {
  await upsertRows(table, rows);
  prevSnapshot = snapshotFromStore();
}

/** تحديث Zustand بعد كتابة DB مباشرة — يمنع حفظاً مزدوجاً من auto-persist */
export function applyLocalDbWrite(update: () => void) {
  applyingRemote = true;
  try {
    update();
  } finally {
    applyingRemote = false;
    prevSnapshot = snapshotFromStore();
  }
}

/** كتابة DB أولاً ثم تحديث الواجهة — للإضافة/التعديل الفوري بين الأجهزة */
export async function persistMutation(
  ops: { table: string; rows: Record<string, unknown>[] }[],
  update: () => void,
): Promise<void> {
  for (const op of ops) {
    if (op.rows.length) await upsertRows(op.table, op.rows);
  }
  applyLocalDbWrite(update);
}

/** @deprecated */
export const initCloudSync = initDatabase;
/** @deprecated */
export const pullFromCloud = loadDatabase;
/** @deprecated */
export async function pushToCloud() {
  const snap = snapshotFromStore();
  const { ops, settingsChanged } = diffSnapshots(prevSnapshot ?? snap, snap);
  await applyWriteOps(ops, settingsChanged, snap);
  return { ok: true as const };
}
