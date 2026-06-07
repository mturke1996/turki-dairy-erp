'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/shared/field';
import { useErpStore } from '@/lib/store/use-erp-store';
import { QUALITY_LABELS, FARMER_STATUS_LABELS } from '@/lib/domain/constants';
import type { Farmer, FarmerStatus, QualityTier } from '@/lib/domain/types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmer?: Farmer | null;
};

const EMPTY = {
  fullName: '',
  region: '',
  phone: '',
  bankAccount: '',
  iban: '',
  avgDailyYield: '',
  qualityTier: 'A' as QualityTier,
  defaultBuyPrice: '',
  status: 'active' as FarmerStatus,
  notes: '',
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
          bankAccount: farmer.bankAccount ?? '',
          iban: farmer.iban ?? '',
          avgDailyYield: farmer.avgDailyYield != null ? String(farmer.avgDailyYield) : '',
          qualityTier: farmer.qualityTier,
          defaultBuyPrice: String(farmer.defaultBuyPrice),
          status: farmer.status,
          notes: farmer.notes ?? '',
        }
      : { ...EMPTY, defaultBuyPrice: String(defaultBuy) },
  );

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  function submit() {
    if (!form.fullName.trim()) return toast.error('أدخل اسم الفلاح.');
    if (!form.region.trim()) return toast.error('أدخل المنطقة.');
    if (!form.phone.trim()) return toast.error('أدخل رقم الهاتف.');

    const iban = normalizeIban(form.iban);
    if (iban && iban.length < 15) return toast.error('رقم الآيبان غير صالح.');

    const payload = {
      fullName: form.fullName.trim(),
      region: form.region.trim(),
      phone: form.phone.trim(),
      bankAccount: form.bankAccount.trim() || undefined,
      iban: iban || undefined,
      avgDailyYield: form.avgDailyYield.trim() ? Number(form.avgDailyYield) : undefined,
      qualityTier: form.qualityTier,
      defaultBuyPrice: Number(form.defaultBuyPrice) || defaultBuy,
      status: form.status,
      notes: form.notes.trim() || undefined,
    };

    if (isEdit && farmer) {
      updateFarmer(farmer.id, payload);
      toast.success('تم تحديث بيانات الفلاح');
    } else {
      addFarmer({ ...payload, onboardingDate: new Date().toISOString() });
      toast.success('تمت إضافة الفلاح');
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'تعديل بيانات فلاح' : 'إضافة فلاح جديد'}</DialogTitle>
          <DialogDescription>المعلومات الأساسية لمورّد الحليب وسعره الافتراضي.</DialogDescription>
        </DialogHeader>

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
          <Field label="رقم الحساب" hint="اختياري" className="sm:col-span-2">
            <Input
              dir="ltr"
              value={form.bankAccount}
              onChange={(e) => set({ bankAccount: e.target.value })}
              placeholder="0021-554390"
              className="font-mono"
            />
          </Field>
          <Field label="رقم الآيبان (IBAN)" hint="اختياري" className="sm:col-span-2">
            <Input
              dir="ltr"
              value={form.iban}
              onChange={(e) => set({ iban: e.target.value })}
              placeholder="LY83 0021 0000 0000 5543 90"
              className="font-mono uppercase"
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
          <Button onClick={submit}>{isEdit ? 'حفظ التعديلات' : 'إضافة الفلاح'}</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
