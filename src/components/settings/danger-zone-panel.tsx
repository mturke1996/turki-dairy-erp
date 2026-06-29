'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useErpStore } from '@/lib/store/use-erp-store';
import { initDatabase, stopDatabase } from '@/lib/supabase/live-db';

const DELETED_ITEMS = [
  'كل الدورات وعمليات الاستلام والبيع',
  'المدفوعات والديون وحركات النقد والتحويلات',
  'المصاريف وكشوف الرواتب والإيرادات الخارجية',
  'سجل التدقيق وتسويات المخزون',
  'الخزن النقدية والحسابات البنكية وتصنيفات المصاريف',
];

const KEPT_ITEMS = ['الموظفون', 'الفلاحون', 'العملاء', 'حسابات المستخدمين والإعدادات'];

export function DangerZonePanel() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const employeesCount = useErpStore((s) => s.employees.length);
  const farmersCount = useErpStore((s) => s.farmers.length);
  const customersCount = useErpStore((s) => s.customers.length);

  useEffect(() => {
    if (!open) setPassword('');
  }, [open]);

  async function handleReset() {
    if (!password) {
      toast.error('أدخل كلمة السر للتأكيد.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        kept?: { employees: number; farmers: number; customers: number };
        error?: string;
        hint?: string;
      };
      if (!res.ok) throw new Error(data.error ?? 'فشل الحذف');

      // أوقف الحفظ الفوري حتى لا يُعيد دفع الحالة القديمة، ثم اضبط الحالة المحلية على الوضع النظيف
      stopDatabase();
      useErpStore.getState().applyServerReset();
      const reloaded = await initDatabase();
      if (!reloaded.ok) {
        toast.error(reloaded.error ?? 'تعذّرت إعادة التحميل — حدّث الصفحة يدوياً.');
      }

      toast.success(
        `تم حذف كل البيانات. تم الإبقاء على ${data.kept?.employees ?? employeesCount} موظف، ${data.kept?.farmers ?? farmersCount} فلاح، ${data.kept?.customers ?? customersCount} عميل.`,
      );
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'تعذّر إجراء الحذف');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card className="border-rose-200 dark:border-rose-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px] text-rose-700 dark:text-rose-400">
            <AlertTriangle className="h-4.5 w-4.5" />
            منطقة الخطر — إعادة ضبط المصنع
          </CardTitle>
          <CardDescription>
            يحذف كل الحركات المسجّلة (استلام، بيع، مدفوعات، ديون، نقد، مصاريف، رواتب) والخزن والبنوك
            وتصنيفات المصاريف، ويُبقي فقط الموظفين والفلاحين والعملاء لتبدأ التسجيل من جديد. لا يمكن
            التراجع عن هذه العملية.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-canvas-sunken/60 p-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                سيُحذف نهائياً
              </p>
              <ul className="space-y-1 text-[12px] leading-relaxed text-foreground/80">
                {DELETED_ITEMS.map((t) => (
                  <li key={t} className="flex items-start gap-1.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rose-500" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-pastel-green/60 bg-pastel-green/50 p-3 dark:border-pastel-green/40 dark:bg-pastel-green/20">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                سيُحتفظ به
              </p>
              <ul className="space-y-1 text-[12px] leading-relaxed text-foreground/80">
                {KEPT_ITEMS.map((t) => (
                  <li key={t} className="flex items-start gap-1.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-pastel-greenInk" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-muted-foreground">
                حالياً: {employeesCount} موظف · {farmersCount} فلاح · {customersCount} عميل
              </p>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="destructive" onClick={() => setOpen(true)}>
              <RotateCcw className="h-4 w-4" />
              حذف كل البيانات والبدء من جديد
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => (busy ? undefined : setOpen(v))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              تأكيد الحذف الشامل
            </DialogTitle>
            <DialogDescription>
              هذا الإجراء يحذف كل الحركات والخزن والبنوك نهائياً ولا يمكن التراجع عنه. سيُحذف سجل التدقيق
              أيضاً. اكتب كلمة السر للتأكيد.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg bg-rose-50 p-3 text-[12px] leading-relaxed text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
              سيُحتفظ بـ <strong>{employeesCount}</strong> موظف و<strong>{farmersCount}</strong> فلاح
              و<strong>{customersCount}</strong> عميل فقط، ويُحذف كل ما عداها.
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reset-password">كلمة السر للتأكيد</Label>
              <Input
                id="reset-password"
                dir="ltr"
                type="password"
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={busy}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !busy) void handleReset();
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="destructive" onClick={() => void handleReset()} disabled={busy || !password}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              {busy ? 'جارٍ الحذف…' : 'حذف نهائي'}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
