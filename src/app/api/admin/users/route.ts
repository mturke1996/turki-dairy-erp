import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/server';
import {
  adminConfigErrorMessage,
  getAdminClientConfigStatus,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from '@/lib/supabase/env';
import type { Role } from '@/lib/domain/types';

function adminClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function adminConfigError() {
  const status = getAdminClientConfigStatus();
  if (status.ok) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY غير مهيّأ' }, { status: 503 });
  }
  return NextResponse.json(
    { error: adminConfigErrorMessage(status.missing), missing: status.missing },
    { status: 503 },
  );
}

async function assertAdmin() {
  const sb = await createServerClient();
  const { data: userData, error: userError } = await sb.auth.getUser();
  if (userError || !userData.user) {
    return { error: NextResponse.json({ error: 'غير مصرّح' }, { status: 401 }) };
  }

  const { data: profile } = await sb.from('profiles').select('role').eq('id', userData.user.id).maybeSingle();
  if (profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'صلاحية المدير مطلوبة' }, { status: 403 }) };
  }

  return { userId: userData.user.id };
}

/** GET — قائمة المستخدمين */
export async function GET() {
  const auth = await assertAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const admin = adminClient();
  if (!admin) {
    return adminConfigError();
  }

  const { data, error } = await admin.from('profiles').select('id,email,name,role,created_at').order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data });
}

/** POST — إنشاء مستخدم جديد */
export async function POST(request: Request) {
  const auth = await assertAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const admin = adminClient();
  if (!admin) {
    return adminConfigError();
  }

  const body = (await request.json()) as { email?: string; password?: string; name?: string; role?: Role };
  if (!body.email || !body.password || body.password.length < 6) {
    return NextResponse.json({ error: 'البريد وكلمة المرور (6+ أحرف) مطلوبان' }, { status: 400 });
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { name: body.name ?? body.email.split('@')[0] },
    app_metadata: { role: body.role ?? 'admin' },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (data.user) {
    await admin.from('profiles').upsert({
      id: data.user.id,
      email: body.email,
      name: body.name ?? body.email.split('@')[0],
      role: body.role ?? 'admin',
    });
  }

  return NextResponse.json({ ok: true, id: data.user?.id });
}

/** PATCH — تحديث دور مستخدم */
export async function PATCH(request: Request) {
  const auth = await assertAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const admin = adminClient();
  if (!admin) {
    return adminConfigError();
  }

  const body = (await request.json()) as { id?: string; role?: Role; name?: string };
  if (!body.id || !body.role) {
    return NextResponse.json({ error: 'المعرّف والدور مطلوبان' }, { status: 400 });
  }

  const { error } = await admin.from('profiles').update({ role: body.role, name: body.name }).eq('id', body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
