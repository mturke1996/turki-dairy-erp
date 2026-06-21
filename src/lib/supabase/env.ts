/** قراءة متغيرات Supabase — NEXT_PUBLIC_* يجب قراءتها بأسماء ثابتة ليعمل inlining في Next.js. */

function pickFirst(...values: (string | undefined)[]): string | undefined {
  for (const raw of values) {
    if (raw == null) continue;
    const trimmed = raw.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return undefined;
}

/** أسماء ثابتة — لا تستخدم process.env[name] للمتغيرات العامة (يكسر Vercel/المتصفح). */
export function getSupabaseUrl(): string | undefined {
  return pickFirst(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_URL,
  );
}

export function getSupabasePublishableKey(): string | undefined {
  return pickFirst(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.SUPABASE_ANON_KEY,
  );
}

function readServerEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const raw = process.env[name];
    if (raw == null) continue;
    const trimmed = raw.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return undefined;
}

/** مفتاح service role — خادم فقط، لا تضعه في NEXT_PUBLIC_. */
export function getSupabaseServiceRoleKey(): string | undefined {
  return readServerEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY');
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
