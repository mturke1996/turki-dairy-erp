'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  SlidersHorizontal,
  ShieldCheck,
  Database,
  Trash2,
  RefreshCw,
  Check,
  X,
  Cloud,
  CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/shared/field';
import { CloudSyncPanel } from '@/components/settings/cloud-sync-panel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useErpStore } from '@/lib/store/use-erp-store';
import { usePermission } from '@/lib/store/use-permission';
import { ROLE_LABELS, PERMISSION_MATRIX, type Permission } from '@/lib/domain/constants';
import type { Role } from '@/lib/domain/types';
import { BRAND } from '@/lib/brand';

const PERMISSION_LABELS: Record<Permission, string> = {
  'users.manage': 'إدارة المستخدمين',
  'sessions.close': 'إغلاق الفترات',
  'supply.record': 'تسجيل التوريد',
  'sales.record': 'تسجيل المبيعات',
  'vaults.manage': 'إدارة الخزن والبنوك',
  'expenses.record': 'تسجيل المصاريف',
  'hr.manage': 'إدارة الموظفين',
  'payroll.pay': 'صرف الرواتب',
  'reports.financial': 'التقارير المالية',
  'prices.edit': 'تعديل الأسعار',
  'data.export': 'تصدير البيانات',
  'transactions.delete': 'حذف العمليات',
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function SettingsPage() {
  const settings = useErpStore((s) => s.settings);
  const updateSettings = useErpStore((s) => s.updateSettings);
  const resetDemo = useErpStore((s) => s.resetDemo);
  const clearData = useErpStore((s) => s.clearData);
  const role = useErpStore((s) => s.auth?.role ?? 'viewer');
  const setRole = useErpStore((s) => s.setRole);
  const canEditPrices = usePermission('prices.edit');
  const canDelete = usePermission('transactions.delete');

  const [form, setForm] = useState({
    minStockThreshold: String(settings.minStockThreshold),
    defaultBuyPrice: String(settings.defaultBuyPrice),
    defaultSellPrice: String(settings.defaultSellPrice),
    currencyLabel: settings.currencyLabel,
  });
  const [clearOpen, setClearOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  function saveSettings() {
    updateSettings({
      minStockThreshold: Number(form.minStockThreshold) || 0,
      defaultBuyPrice: Number(form.defaultBuyPrice) || 0,
      defaultSellPrice: Number(form.defaultSellPrice) || 0,
      currencyLabel: form.currencyLabel.trim() || 'د.ل',
    });
    toast.success('تم حفظ الإعدادات');
  }

  const supabaseReady = Boolean(SUPABASE_URL && SUPABASE_KEY);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="النظام"
        title="الإعدادات"
        description="ضبط معايير التشغيل، الصلاحيات، ومصدر البيانات."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* إعدادات التشغيل */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-4.5 w-4.5 text-muted-foreground" />
              معايير التشغيل
            </CardTitle>
            <CardDescription>الأسعار الافتراضية وحدّ التنبيه للمخزون</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="الحد الأدنى للمخزون (لتر)">
              <Input
                type="number"
                inputMode="numeric"
                dir="ltr"
                value={form.minStockThreshold}
                onChange={(e) => setForm({ ...form, minStockThreshold: e.target.value })}
                disabled={!canEditPrices}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="سعر الشراء الافتراضي">
                <Input
                  type="number"
                  step="0.001"
                  dir="ltr"
                  value={form.defaultBuyPrice}
                  onChange={(e) => setForm({ ...form, defaultBuyPrice: e.target.value })}
                  disabled={!canEditPrices}
                />
              </Field>
              <Field label="سعر البيع الافتراضي">
                <Input
                  type="number"
                  step="0.001"
                  dir="ltr"
                  value={form.defaultSellPrice}
                  onChange={(e) => setForm({ ...form, defaultSellPrice: e.target.value })}
                  disabled={!canEditPrices}
                />
              </Field>
            </div>
            <Field label="رمز العملة">
              <Input
                value={form.currencyLabel}
                onChange={(e) => setForm({ ...form, currencyLabel: e.target.value })}
                disabled={!canEditPrices}
              />
            </Field>
            {canEditPrices ? (
              <Button onClick={saveSettings}>
                <Check className="h-4 w-4" />
                حفظ الإعدادات
              </Button>
            ) : (
              <p className="text-[12px] text-muted-foreground">تعديل الإعدادات متاح للمدير والمحاسب فقط.</p>
            )}
          </CardContent>
        </Card>

        {/* الصلاحيات */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5 text-muted-foreground" />
              الدور والصلاحيات
            </CardTitle>
            <CardDescription>بدّل الدور لاختبار التحكم بالوصول (RBAC)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="الدور الحالي">
              <Select value={role} onValueChange={(v) => { setRole(v as Role); toast.success(`تم التبديل إلى: ${ROLE_LABELS[v as Role]}`); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="space-y-2">
              <p className="text-[12px] font-medium text-muted-foreground">صلاحيات هذا الدور:</p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {(Object.keys(PERMISSION_LABELS) as Permission[]).map((p) => {
                  const allowed = PERMISSION_MATRIX[p].includes(role);
                  return (
                    <div
                      key={p}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] ${
                        allowed ? 'border-meadow-100 bg-meadow-50 text-meadow-800' : 'border-border bg-canvas-sunken/40 text-muted-foreground'
                      }`}
                    >
                      {allowed ? <Check className="h-3.5 w-3.5 shrink-0" /> : <X className="h-3.5 w-3.5 shrink-0" />}
                      {PERMISSION_LABELS[p]}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* مصدر البيانات / Supabase */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-4.5 w-4.5 text-muted-foreground" />
              مصدر البيانات
            </CardTitle>
            <CardDescription>الربط مع Supabase للتخزين السحابي</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-canvas-sunken">
                  <Database className="h-4.5 w-4.5 text-muted-foreground" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold">التخزين المحلي (الحالي)</p>
                  <p className="text-[11.5px] text-muted-foreground">localStorage على هذا الجهاز</p>
                </div>
              </div>
              <Badge variant="success">نشط</Badge>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-meadow-50">
                  <Cloud className="h-4.5 w-4.5 text-meadow-600" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold">Supabase</p>
                  <p className="text-[11.5px] text-muted-foreground" dir="ltr">
                    {SUPABASE_URL ? SUPABASE_URL.replace('https://', '') : 'غير مهيّأ'}
                  </p>
                </div>
              </div>
              {supabaseReady ? (
                <Badge variant="info">
                  <CheckCircle2 className="h-3 w-3" />
                  مهيّأ
                </Badge>
              ) : (
                <Badge variant="neutral">غير مهيّأ</Badge>
              )}
            </div>

            {supabaseReady ? (
              <CloudSyncPanel />
            ) : (
              <p className="rounded-lg bg-canvas-sunken/60 p-3 text-[11.5px] leading-relaxed text-muted-foreground">
                أضف NEXT_PUBLIC_SUPABASE_URL والمفتاح في .env.local لتفعيل التخزين السحابي.
              </p>
            )}
          </CardContent>
        </Card>

        {/* إدارة البيانات */}
        <Card className="border-rose-200/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4.5 w-4.5 text-muted-foreground" />
              إدارة البيانات
            </CardTitle>
            <CardDescription>تحميل بيانات تجريبية أو البدء بنظام فارغ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-[13px] font-semibold">بيانات تجريبية</p>
                <p className="text-[11.5px] text-muted-foreground">إعادة تحميل فلاحين وعملاء وعمليات للعرض</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}>
                <RefreshCw className="h-3.5 w-3.5" />
                تحميل
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-rose-200/70 bg-rose-50/40 p-3">
              <div>
                <p className="text-[13px] font-semibold text-rose-700">حذف جميع البيانات</p>
                <p className="text-[11.5px] text-rose-600/80">البدء بنظام نظيف فارغ تماماً</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setClearOpen(true)}
                disabled={!canDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
                حذف الكل
              </Button>
            </div>
            {!canDelete ? (
              <p className="text-[11.5px] text-muted-foreground">حذف البيانات متاح للمدير فقط.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        {BRAND.fullName} · الإصدار 1.0.0
      </p>

      {/* تأكيد حذف الكل */}
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>حذف جميع البيانات</DialogTitle>
            <DialogDescription>
              سيتم حذف كل الفلاحين والعملاء والعمليات والفترات نهائياً، والبدء بفترة جديدة فارغة. لا يمكن التراجع.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                clearData();
                setClearOpen(false);
                toast.success('تم حذف جميع البيانات', { description: 'النظام الآن فارغ وجاهز لبياناتك.' });
              }}
            >
              <Trash2 className="h-4 w-4" />
              نعم، احذف الكل
            </Button>
            <Button variant="ghost" onClick={() => setClearOpen(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* تأكيد تحميل التجريبي */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تحميل بيانات تجريبية</DialogTitle>
            <DialogDescription>
              سيتم استبدال البيانات الحالية ببيانات عرض تجريبية. لا يمكن التراجع.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                resetDemo();
                setResetOpen(false);
                toast.success('تم تحميل البيانات التجريبية');
              }}
            >
              <RefreshCw className="h-4 w-4" />
              تحميل
            </Button>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
