'use client';

/** @deprecated استورد من live-db مباشرة */
export {
  initDatabase,
  initCloudSync,
  loadDatabase,
  pullFromCloud,
  pushToCloud,
  persistRowsNow,
  persistMutation,
  applyLocalDbWrite,
  stopDatabase,
  useDbStore,
  useSyncStore,
  type DbStatus,
  type RealtimeStatus,
} from './live-db';

export { isSupabaseConfigured, testConnection } from './repository';
