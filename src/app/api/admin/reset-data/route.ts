import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/server';

/** كلمة السر المطلوبة لتأكيد الحذف الشامل. */
const RESET_PASSWORD = 'Mturke96';

/**
 * جداول تُحذف بالكامل (بترتيب احترام قيود المفاتيح الأجنبية RESTRICT).
 * يُبقى: employees, farmers, customers, profiles, app_settings.
 * تُحذف الجداول الابنة قبل الآباء عند وجود RESTRICT.
 */
const DELETE_ORDER: string[] = [
  'supplies', // farmer_id RESTRICT (يُبقى الفلاحون) + session_id CASCADE
  'sales', // customer_id RESTRICT (يُبقى العملاء) + session_id CASCADE
  'payments',
  'debt_entries', // session_id RESTRICT → قبل sessions
  'external_incomes', // session_id RESTRICT → قبل sessions
  'inventory_adjustments',
  'cash_movements',
  'cash_transfers',
  'expenses', // category_id RESTRICT → قبل expense_categories
  'payroll_batches',
  'audit_logs',
  'sessions', // debt_entries/external_incomes محذوفة — آمن الآن
  'cash_vaults',
  'bank_accounts', // employees.bank_id ON DELETE SET NULL
  'expense_categories', // expenses محذوفة — آمن الآن
];

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
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

/** حذف كل صفوف جدول عبر service role (تتجاوز RLS). */
async function deleteAllRows(sb: ReturnType<typeof adminClient>, table: string): Promise<void> {
  if (!sb) return;
  // شرط id != '__never__' يطابق كل الصفوف (لا يوجد id بهذا المُعامل) — حذف شامل آمن
  const { error } = await sb.from(table).delete().neq('id', '__never_match__');
  if (error) throw new Error(`${table}: ${error.message}`);
}

/** POST — حذف شامل لكل الحركات مع إبقاء الموظفين/الفلاحين/العملاء. */
export async function POST(request: Request) {
  const auth = await assertAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as { password?: string };
  if (!body.password) {
    return NextResponse.json({ error: 'كلمة السر مطلوبة للتأكيد' }, { status: 400 });
  }
  // تحقّق إضافي على الخادم (التحقّق الفعلي النهائي يتم في قاعدة البيانات أيضًا إن وُجدت الدالة)
  if (body.password !== RESET_PASSWORD) {
    return NextResponse.json({ error: 'كلمة السر غير صحيحة' }, { status: 403 });
  }

  const admin = adminClient();
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY غير مهيّأ' }, { status: 503 });
  }

  try {
    // 1) حذف الجداول بالترتيب
    for (const table of DELETE_ORDER) {
      await deleteAllRows(admin, table);
    }

    // 2) تنظيف مراجع الموظفين للخزن/البنوك المحذوفة (bank_id يُصفّر تلقائيًا عبر SET NULL،
    //    لكن default_payout_* بدون FK — نصفّرها يدويًا لتجنّب مراجع معلّقة)
    const { error: empErr } = await admin
      .from('employees')
      .update({ bank_id: null, default_payout_type: null, default_payout_id: null })
      .neq('id', '__never_match__');
    if (empErr) throw new Error(`employees cleanup: ${empErr.message}`);

    // 3) تصفير الدورة النشطة في الإعدادات (لا دورات بعد الحذف) مع إبقاء الأسعار/العملة
    const { error: settingsErr } = await admin
      .from('app_settings')
      .update({ active_session_id: null, updated_at: new Date().toISOString() })
      .eq('id', 'singleton');
    if (settingsErr) throw new Error(`app_settings: ${settingsErr.message}`);

    // 4) تأكّد من أن البيانات المحفوظة لا تزال موجودة (للعرض في الواجهة)
    const [{ count: employees }, { count: farmers }, { count: customers }] = await Promise.all([
      admin.from('employees').select('*', { count: 'exact', head: true }),
      admin.from('farmers').select('*', { count: 'exact', head: true }),
      admin.from('customers').select('*', { count: 'exact', head: true }),
    ]);

    return NextResponse.json({
      ok: true,
      kept: {
        employees: employees ?? 0,
        farmers: farmers ?? 0,
        customers: customers ?? 0,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'فشل الحذف الشامل';
    return NextResponse.json(
      { error: message, hint: 'يمكن إعادة المحاولة — البيانات المحفوظة (موظفون/فلاحون/عملاء) لم تُمَس.' },
      { status: 500 },
    );
  }
}
