/** إعدادات Supabase — مصدر البيانات الوحيد (PostgreSQL). */

import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/env';

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

/** التطبيق يعمل حصرياً على قاعدة البيانات — لا وضع localStorage. */
export function isDatabaseMode(): boolean {
  return isSupabaseConfigured();
}

/** مصادقة Supabase مطلوبة لكل المسارات المحمية. */
export function isAuthRequired(): boolean {
  return isSupabaseConfigured();
}

/** @deprecated استخدم isDatabaseMode */
export function isCloudSyncAvailable(): boolean {
  return isSupabaseConfigured();
}

/** @deprecated لا يوجد وضع محلي */
export function isLocalDataSource(): boolean {
  return false;
}
