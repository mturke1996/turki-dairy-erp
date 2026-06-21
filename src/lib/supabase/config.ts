/** إعدادات Supabase — مصدر البيانات الوحيد (PostgreSQL). */

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
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
