/**
 * منسّق المزامنة السحابية (Supabase).
 *
 * الاستراتيجية: محلي-أولاً (Zustand + localStorage) مع مزامنة سحابية:
 *   • السحب (pull): مرة عند الإقلاع + زر «إعادة تحميل».
 *   • الدفع (push): تلقائي مع تأخير (debounce) بعد كل تعديل.
 *
 * المفتاح المنشور (publishable) يُستخدم مباشرةً من المتصفح مع RLS مسموح
 * (أداة داخلية). فعّل Supabase Auth لتقييد الوصول في الإنتاج.
 */

'use client';

import { create } from 'zustand';
import { useErpStore } from '@/lib/store/use-erp-store';
import { isSupabaseConfigured, pullAll, pushAll, testConnection, type ErpSnapshot } from './repository';

export type SyncStatus = 'disabled' | 'idle' | 'syncing' | 'pushing' | 'error' | 'offline';

interface SyncState {
  configured: boolean;
  enabled: boolean;
  status: SyncStatus;
  lastSyncAt: string | null;
  lastError: string | null;
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
  setEnabled: (v) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ENABLED_KEY, v ? '1' : '0');
    }
    set({ enabled: v, status: v ? 'idle' : 'disabled' });
  },
  setStatus: (s) => set({ status: s }),
}));

/** يجمع لقطة كاملة من حالة المتجر الحالية لرفعها. */
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

let applyingRemote = false; // يمنع دفع التغييرات الناتجة عن السحب

/** يسحب كامل البيانات من السحابة إلى المتجر. */
export async function pullFromCloud(): Promise<{ ok: boolean; error?: string }> {
  const { setStatus } = useSyncStore.getState();
  setStatus('syncing');
  try {
    const data = await pullAll();

    // السحابة غير مهيّأة (لا توجد دورات) → ارفع الحالة المحلية بدل مسحها
    if (!data.sessions || data.sessions.length === 0) {
      await pushAll(snapshot());
      useSyncStore.setState({ status: 'idle', lastSyncAt: new Date().toISOString(), lastError: null });
      return { ok: true };
    }

    applyingRemote = true;
    useErpStore.getState().replaceAll(data);
    applyingRemote = false;
    useSyncStore.setState({ status: 'idle', lastSyncAt: new Date().toISOString(), lastError: null });
    return { ok: true };
  } catch (e) {
    applyingRemote = false;
    const error = e instanceof Error ? e.message : 'فشل السحب';
    useSyncStore.setState({ status: 'error', lastError: error });
    return { ok: false, error };
  }
}

/** يرفع كامل الحالة إلى السحابة. */
export async function pushToCloud(): Promise<{ ok: boolean; error?: string }> {
  useSyncStore.setState({ status: 'pushing' });
  try {
    await pushAll(snapshot());
    useSyncStore.setState({ status: 'idle', lastSyncAt: new Date().toISOString(), lastError: null });
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'فشل الرفع';
    useSyncStore.setState({ status: 'error', lastError: error });
    return { ok: false, error };
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;

/** يبدأ الدفع التلقائي بعد كل تعديل (مع تأخير). */
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

/** يُستدعى مرة واحدة بعد الإماهة: يسحب البيانات ثم يفعّل الدفع التلقائي. */
export async function initCloudSync(): Promise<void> {
  const { configured, enabled } = useSyncStore.getState();
  if (!configured || !enabled) {
    useSyncStore.setState({ status: enabled ? 'idle' : 'disabled' });
    return;
  }
  const probe = await testConnection();
  if (!probe.ok) {
    useSyncStore.setState({ status: 'offline', lastError: probe.error ?? null });
    return;
  }
  await pullFromCloud();
  startAutoPush();
}

/** يفعّل المزامنة لأول مرة: يدفع البيانات المحلية الحالية ثم يبدأ المزامنة. */
export async function enableAndBootstrap(): Promise<{ ok: boolean; error?: string }> {
  useSyncStore.getState().setEnabled(true);
  const probe = await testConnection();
  if (!probe.ok) {
    useSyncStore.setState({ status: 'offline', lastError: probe.error ?? null });
    return { ok: false, error: probe.error };
  }
  const pushed = await pushToCloud();
  if (!pushed.ok) return pushed;
  startAutoPush();
  return { ok: true };
}
