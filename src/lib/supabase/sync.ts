/**
 * منسّق المزامنة السحابية (Supabase).
 *
 * الاستراتيجية: محلي-أولاً (Zustand + localStorage) مع مزامنة سحابية:
 *   • السحب (pull): عند الإقلاع + عند التعارض + زر «سحب».
 *   • الدفع (push): تلقائي مع debounce — upsert + حذف اليتيمة + sync_version.
 *   • التعارض: إذا السحابة أحدث → سحب تلقائي ثم إعادة محاولة الدفع مرة واحدة.
 */

'use client';

import { create } from 'zustand';
import { useErpStore } from '@/lib/store/use-erp-store';
import {
  isSupabaseConfigured,
  pullAll,
  pushAll,
  testConnection,
  SyncConflictError,
  type ErpSnapshot,
} from './repository';

export type SyncStatus = 'disabled' | 'idle' | 'syncing' | 'pushing' | 'conflict' | 'error' | 'offline';

interface SyncState {
  configured: boolean;
  enabled: boolean;
  status: SyncStatus;
  lastSyncAt: string | null;
  lastError: string | null;
  remoteVersion: number;
  setEnabled: (v: boolean) => void;
  setStatus: (s: SyncStatus) => void;
}

const ENABLED_KEY = 'turki-cloud-sync-enabled';

function readEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(ENABLED_KEY) === '1';
}

export const useSyncStore = create<SyncState>((set) => ({
  configured: isSupabaseConfigured(),
  enabled: readEnabled(),
  status: 'disabled',
  lastSyncAt: null,
  lastError: null,
  remoteVersion: 0,
  setEnabled: (v) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ENABLED_KEY, v ? '1' : '0');
    }
    set({ enabled: v, status: v ? 'idle' : 'disabled' });
  },
  setStatus: (s) => set({ status: s }),
}));

function snapshot(): ErpSnapshot {
  const s = useErpStore.getState();
  return {
    sessions: s.sessions,
    activeSessionId: s.activeSessionId,
    farmers: s.farmers,
    customers: s.customers,
    supplies: s.supplies,
    sales: s.sales,
    payments: s.payments,
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

function applyRemote(data: ErpSnapshot): void {
  applyingRemote = true;
  useErpStore.getState().replaceAll(data);
  applyingRemote = false;
}

/** يسحب كامل البيانات من السحابة إلى المتجر. */
export async function pullFromCloud(): Promise<{ ok: boolean; error?: string }> {
  useSyncStore.setState({ status: 'syncing' });
  try {
    const data = await pullAll();

    if (!data.sessions?.length) {
      await pushAll(snapshot(), { skipConflictCheck: true });
      useSyncStore.setState({
        status: 'idle',
        lastSyncAt: new Date().toISOString(),
        lastError: null,
        remoteVersion: data.syncVersion,
      });
      return { ok: true };
    }

    applyRemote(data);
    useSyncStore.setState({
      status: 'idle',
      lastSyncAt: new Date().toISOString(),
      lastError: null,
      remoteVersion: data.syncVersion,
    });
    return { ok: true };
  } catch (e) {
    applyingRemote = false;
    const error = e instanceof Error ? e.message : 'فشل السحب';
    useSyncStore.setState({ status: 'error', lastError: error });
    return { ok: false, error };
  }
}

/** يرفع كامل الحالة — مع معالجة التعارض تلقائياً. */
export async function pushToCloud(retryOnConflict = true): Promise<{ ok: boolean; error?: string; conflictResolved?: boolean }> {
  useSyncStore.setState({ status: 'pushing' });
  try {
    const version = await pushAll(snapshot());
    useSyncStore.setState({
      status: 'idle',
      lastSyncAt: new Date().toISOString(),
      lastError: null,
      remoteVersion: version,
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof SyncConflictError && retryOnConflict) {
      useSyncStore.setState({ status: 'conflict', lastError: e.message });
      const pulled = await pullFromCloud();
      if (!pulled.ok) return pulled;
      return pushToCloud(false).then((r) => ({ ...r, conflictResolved: true }));
    }
    const error = e instanceof Error ? e.message : 'فشل الرفع';
    useSyncStore.setState({ status: 'error', lastError: error });
    return { ok: false, error };
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;

function startAutoPush() {
  if (unsubscribe) return;
  unsubscribe = useErpStore.subscribe(() => {
    if (applyingRemote) return;
    if (!useSyncStore.getState().enabled) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      void pushToCloud();
    }, 2000);
  });
}

export function stopAutoSync() {
  if (debounceTimer) clearTimeout(debounceTimer);
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

/** يبدأ المزامنة في الخلفية دون حجب الواجهة — البيانات المحلية تظهر فوراً. */
export function initCloudSync(): void {
  const { configured, enabled } = useSyncStore.getState();
  if (!configured || !enabled) {
    useSyncStore.setState({ status: enabled ? 'idle' : 'disabled' });
    return;
  }
  startAutoPush();
  void (async () => {
    const probe = await testConnection();
    if (!probe.ok) {
      useSyncStore.setState({ status: 'offline', lastError: probe.error ?? null });
      return;
    }
    await pullFromCloud();
  })();
}

export async function enableAndBootstrap(): Promise<{ ok: boolean; error?: string }> {
  useSyncStore.getState().setEnabled(true);
  const probe = await testConnection();
  if (!probe.ok) {
    useSyncStore.setState({ status: 'offline', lastError: probe.error ?? null });
    return { ok: false, error: probe.error };
  }
  const pushed = await pushToCloud(false);
  if (!pushed.ok) return pushed;
  startAutoPush();
  return { ok: true };
}
