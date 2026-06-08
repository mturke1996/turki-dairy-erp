'use client';

import { create } from 'zustand';
import { useErpStore } from '@/lib/store/use-erp-store';
import { isSupabaseConfigured } from './config';
import {
  pullAll,
  pushAll,
  testConnection,
  SyncConflictError,
  type ErpSnapshot,
} from './repository';

export type SyncStatus = 'idle' | 'syncing' | 'pushing' | 'conflict' | 'error' | 'offline' | 'unconfigured';

interface SyncState {
  configured: boolean;
  status: SyncStatus;
  lastSyncAt: string | null;
  lastError: string | null;
  remoteVersion: number;
  setStatus: (s: SyncStatus) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  configured: isSupabaseConfigured(),
  status: isSupabaseConfigured() ? 'idle' : 'unconfigured',
  lastSyncAt: null,
  lastError: null,
  remoteVersion: 0,
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

export async function pullFromCloud(): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase غير مهيّأ' };
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
    const error = e instanceof Error ? e.message : 'فشل تحميل البيانات';
    useSyncStore.setState({ status: 'error', lastError: error });
    return { ok: false, error };
  }
}

export async function pushToCloud(retryOnConflict = true): Promise<{ ok: boolean; error?: string; conflictResolved?: boolean }> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase غير مهيّأ' };
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
    const error = e instanceof Error ? e.message : 'فشل حفظ البيانات';
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
    if (!isSupabaseConfigured()) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      void pushToCloud();
    }, 1500);
  });
}

export function stopAutoSync() {
  if (debounceTimer) clearTimeout(debounceTimer);
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

/** يحمّل من PostgreSQL ويفعّل الحفظ التلقائي */
export async function initCloudSync(): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    useSyncStore.setState({ status: 'unconfigured', lastError: 'Supabase غير مهيّأ' });
    return { ok: false, error: 'Supabase غير مهيّأ' };
  }

  const probe = await testConnection();
  if (!probe.ok) {
    useSyncStore.setState({ status: 'offline', lastError: probe.error ?? null });
    return { ok: false, error: probe.error };
  }

  const pulled = await pullFromCloud();
  if (!pulled.ok) return pulled;

  startAutoPush();
  return { ok: true };
}

/** @deprecated — المزامنة دائماً مفعّلة */
export async function enableAndBootstrap(): Promise<{ ok: boolean; error?: string }> {
  return initCloudSync();
}
