/** قراءة متغيرات Supabase مع trim وأسماء بديلة (Vercel / Supabase integration). */

function readEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const raw = process.env[name];
    if (raw == null) continue;
    const trimmed = raw.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return undefined;
}

export function getSupabaseUrl(): string | undefined {
  return readEnv('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL');
}

export function getSupabasePublishableKey(): string | undefined {
  return readEnv(
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_ANON_KEY',
  );
}

/** مفتاح service role — خادم فقط، لا تضعه في NEXT_PUBLIC_. */
export function getSupabaseServiceRoleKey(): string | undefined {
  return readEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY');
}

export function getAdminClientConfigStatus(): { ok: true } | { ok: false; missing: string[] } {
  const missing: string[] = [];
  if (!getSupabaseUrl()) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!getSupabaseServiceRoleKey()) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true };
}

export function adminConfigErrorMessage(missing: string[]): string {
  return (
    `إعدادات الخادم ناقصة: ${missing.join('، ')}. ` +
    'في Vercel: Settings → Environment Variables → Production (وPreview إن لزم) → أضف المفتاح من Supabase (Project Settings → API → service_role) → ثم **Redeploy**.'
  );
}
