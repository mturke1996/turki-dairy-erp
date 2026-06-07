/** إعدادات Supabase المركزية — يُستخدم في العميل والخادم والـ middleware. */

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

/** الوضع المحلي: بدون مصادقة Supabase (تطوير / عمل offline). */
export function isLocalDataSource(): boolean {
  return process.env.NEXT_PUBLIC_DATA_SOURCE === 'local';
}

/** هل يُفرَض Supabase Auth على المسارات المحمية؟ */
export function isAuthRequired(): boolean {
  return isSupabaseConfigured() && !isLocalDataSource();
}

/** هل المزامنة السحابية متاحة؟ */
export function isCloudSyncAvailable(): boolean {
  return isSupabaseConfigured();
}
