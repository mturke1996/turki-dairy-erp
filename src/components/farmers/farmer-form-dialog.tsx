'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/shared/field';
import { CopyableInput } from '@/components/shared/copyable-input';
import { AmountInput } from '@/components/shared/amount-input';
import { useErpStore } from '@/lib/store/use-erp-store';
import { QUALITY_LABELS, FARMER_STATUS_LABELS } from '@/lib/domain/constants';
import { DEBT_DIRECTION_LABELS } from '@/lib/domain/debt';
import type { DebtDirection, Farmer, FarmerStatus, QualityTier } from '@/lib/domain/types';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmer?: Farmer | null;
};

const EMPTY = {
  fullName: '',
  region: '',
  phone: '',
  bankName: '',
  bankAccount: '',
  iban: '',
  avgDailyYield: '',
  qualityTier: 'A' as QualityTier,
  defaultBuyPrice: '',
  status: 'active' as FarmerStatus,
  notes: '',
  openingAmount: '',
  openingDirection: 'payable' as DebtDirection,
};

function normalizeIban(value: string): string {
  return value.trim().replace(/\s+/g, '').toUpperCase();
}

export function FarmerFormDialog({ open, onOpenChange, farmer }: Props) {
  const addFarmer = useErpStore((s) => s.addFarmer);
  const updateFarmer = useErpStore((s) => s.updateFarmer);
  const defaultBuy = useErpStore((s) => s.settings.defaultBuyPrice);
  const isEdit = !!farmer;

  const [form, setForm] = useState(() =>
    farmer
      ? {
          fullName: farmer.fullName,
          region: farmer.region,
          phone: farmer.phone,
          bankName: farmer.bankName ?? '',
          bankAccount: farmer.bankAccount ?? '',
          iban: farmer.iban ?? '',
          avgDailyYield: farmer.avgDailyYield != null ? String(farmer.avgDailyYield) : '',
          qualityTier: farmer.qualityTier,
          defaultBuyPrice: String(farmer.defaultBuyPrice),
          status: farmer.status,
          notes: farmer.notes ?? '',
          openingAmount: '',
          openingDirection: 'payable' as DebtDirection,
        }
      : { ...EMPTY, defaultBuyPrice: String(defaultBuy) },
  );

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.fullName.trim()) return toast.error('أدخل اسم الفلاح.');
    if (!form.region.trim()) return toast.error('أدخل المنطقة.');
    if (!form.phone.trim()) return toast.error('أدخل رقم الهاتف.');

    const iban = normalizeIban(form.iban);
    if (iban && iban.length < 15) return toast.error('رقم الآيبان غير صالح.');

    const payload = {
      fullName: form.fullName.trim(),
      region: form.region.trim(),
      phone: form.phone.trim(),
      bankName: form.bankName.trim() || undefined,
      bankAccount: form.bankAccount.trim() || undefined,
      iban: iban || undefined,
      avgDailyYield: form.avgDailyYield.trim() ? Number(form.avgDailyYield) : undefined,
      qualityTier: form.qualityTier,
      defaultBuyPrice: Number(form.defaultBuyPrice) || defaultBuy,
      status: form.status,
      notes: form.notes.trim() || undefined,
    };

    setSaving(true);
    try {
      if (isEdit && farmer) {
        const res = await updateFarmer(farmer.id, payload);
        if (res.ok) {
          toast.success('تم تحديث بيانات الفلاح');
          onOpenChange(false);
        } else {
          toast.error(res.error ?? 'تعذّر تحديث الفلاح');
        }
      } else {
        const openingAmt = Number(form.openingAmount) || 0;
        const res = await addFarmer({
          ...payload,
          onboardingDate: new Date().toISOString().slice(0, 10),
          ...(openingAmt > 0
            ? { openingBalance: { amount: openingAmt, direction: form.openingDirection } }
            : {}),
        });
        if (res.ok) {
          toast.success('تمت إضافة الفلاح');
          setForm({ ...EMPTY, defaultBuyPrice: String(defaultBuy) });
          onOpenChange(false);
        } else {
          toast.error(res.error ?? 'تعذّرت إضافة الفلاح');
        }
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'تعديل بيانات فلاح' : 'إضافة فلاح جديد'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'تحديث بيانات المورّد.' : 'أدخل البيانات الأساسية — يمكنك تسجيل رصيد ديون افتتاحي (له/عليه) مباشرة.'}
          </DialogDescription>
        </DialogHeader>

        {!isEdit ? (
          <div className="rounded-xl border border-meadow-200/80 bg-meadow-50/40 p-4">
            <p className="text-[13px] font-semibold text-meadow-900">رصيد الديون الافتتاحي</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">اختياري — يُسجّل كدين ويظهر في صفحة الديون</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="المبلغ">
                <AmountInput value={form.openingAmount} onChange={(v) => set({ openingAmount: v })} placeholder="0" />
              </Field>
              <Field label="الاتجاه">
                <div className="grid grid-cols-2 gap-2">
                  {(['payable', 'receivable'] as DebtDirection[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => set({ openingDirection: d })}
                      className={cn(
                        'rounded-xl border px-2 py-2.5 text-[11px] font-semibold transition-colors',
                        form.openingDirection === d
                          ? d === 'payable'
                            ? 'border-rose-300 bg-rose-50 text-rose-800 ring-2 ring-rose-200'
                            : 'border-meadow-300 bg-meadow-50 text-meadow-800 ring-2 ring-meadow-200'
                          : 'border-border text-muted-foreground hover:bg-canvas-sunken/60',
                      )}
                    >
                      {DEBT_DIRECTION_LABELS[d]}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="الاسم الكامل" required className="sm:col-span-2">
            <Input value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} placeholder="مثال: محمد علي التركي" />
          </Field>
          <Field label="المنطقة" required>
            <Input value={form.region} onChange={(e) => set({ region: e.target.value })} placeholder="تاجوراء" />
          </Field>
          <Field label="رقم الهاتف" required>
            <Input dir="ltr" value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="091-xxxxxxx" />
          </Field>

          <Field label="اسم المصرف" hint="اختياري" className="sm:col-span-2">
            <Input
              value={form.bankName}
              onChange={(e) => set({ bankName: e.target.value })}
              placeholder="مثال: مصرف الجمهورية — فرع الميناء"
            />
          </Field>
          <Field label="رقم الحساب" hint="اختياري · يمكن النسخ" className="sm:col-span-2">
            <CopyableInput
              dir="ltr"
              value={form.bankAccount}
              onChange={(e) => set({ bankAccount: e.target.value })}
              placeholder="0021-554390"
              className="font-mono"
              copyLabel="رقم الحساب"
            />
          </Field>
          <Field label="رقم الآيبان (IBAN)" hint="اختياري · يمكن النسخ" className="sm:col-span-2">
            <CopyableInput
              dir="ltr"
              value={form.iban}
              onChange={(e) => set({ iban: e.target.value })}
              placeholder="LY83 0021 0000 0000 5543 90"
              className="font-mono uppercase"
              copyLabel="الآيبان"
            />
          </Field>

          <Field label="متوسط الإنتاج اليومي (لتر)" hint="اختياري">
            <Input type="number" dir="ltr" value={form.avgDailyYield} onChange={(e) => set({ avgDailyYield: e.target.value })} placeholder="—" />
          </Field>
          <Field label="درجة الجودة">
            <Select value={form.qualityTier} onValueChange={(v) => set({ qualityTier: v as QualityTier })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['A', 'B', 'C'] as QualityTier[]).map((q) => (
                  <SelectItem key={q} value={q}>
                    {QUALITY_LABELS[q]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="سعر الشراء الافتراضي (د.ل/لتر)">
            <Input type="number" dir="ltr" step="0.001" value={form.defaultBuyPrice} onChange={(e) => set({ defaultBuyPrice: e.target.value })} />
          </Field>
          <Field label="الحالة">
            <Select value={form.status} onValueChange={(v) => set({ status: v as FarmerStatus })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FARMER_STATUS_LABELS) as FarmerStatus[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {FARMER_STATUS_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="ملاحظات" hint="اختياري" className="sm:col-span-2">
            <Input value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={saving}>{saving ? 'جارٍ الحفظ…' : isEdit ? 'حفظ التعديلات' : 'إضافة الفلاح'}</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
