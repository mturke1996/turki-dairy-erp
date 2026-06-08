'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Field } from '@/components/shared/field';
import { useErpStore } from '@/lib/store/use-erp-store';
import { CUSTOMER_TYPE_LABELS, PRICE_TIER_LABELS } from '@/lib/domain/constants';
import type { Customer, CustomerType, PriceTier } from '@/lib/domain/types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
};

const EMPTY = {
  entityName: '',
  entityType: 'factory' as CustomerType,
  taxNumber: '',
  phone: '',
  creditLimit: '',
  paymentTerms: '30',
  priceTier: 'wholesale' as PriceTier,
  defaultSellPrice: '',
  onHold: false,
  notes: '',
};

export function CustomerFormDialog({ open, onOpenChange, customer }: Props) {
  const addCustomer = useErpStore((s) => s.addCustomer);
  const updateCustomer = useErpStore((s) => s.updateCustomer);
  const defaultSell = useErpStore((s) => s.settings.defaultSellPrice);
  const isEdit = !!customer;

  const [form, setForm] = useState(() =>
    customer
      ? {
          entityName: customer.entityName,
          entityType: customer.entityType,
          taxNumber: customer.taxNumber ?? '',
          phone: customer.phone,
          creditLimit: String(customer.creditLimit),
          paymentTerms: String(customer.paymentTerms),
          priceTier: customer.priceTier,
          defaultSellPrice: String(customer.defaultSellPrice),
          onHold: customer.onHold,
          notes: customer.notes ?? '',
        }
      : { ...EMPTY, defaultSellPrice: String(defaultSell) },
  );

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.entityName.trim()) return toast.error('أدخل اسم العميل.');
    if (!form.phone.trim()) return toast.error('أدخل رقم الهاتف.');

    const payload = {
      entityName: form.entityName.trim(),
      entityType: form.entityType,
      taxNumber: form.taxNumber.trim() || undefined,
      phone: form.phone.trim(),
      creditLimit: Number(form.creditLimit) || 0,
      paymentTerms: Number(form.paymentTerms) || 0,
      priceTier: form.priceTier,
      defaultSellPrice: Number(form.defaultSellPrice) || defaultSell,
      onHold: form.onHold,
      notes: form.notes.trim() || undefined,
    };

    setSaving(true);
    try {
      if (isEdit && customer) {
        const res = await updateCustomer(customer.id, payload);
        if (res.ok) {
          toast.success('تم تحديث بيانات العميل');
          onOpenChange(false);
        } else {
          toast.error(res.error ?? 'تعذّر تحديث العميل');
        }
      } else {
        const res = await addCustomer({
          ...payload,
          onboardingDate: new Date().toISOString().slice(0, 10),
        });
        if (res.ok) {
          toast.success('تمت إضافة العميل');
          onOpenChange(false);
        } else {
          toast.error(res.error ?? 'تعذّرت إضافة العميل');
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
          <DialogTitle>{isEdit ? 'تعديل بيانات عميل' : 'إضافة عميل جديد'}</DialogTitle>
          <DialogDescription>المصانع والموزّعون وتجار التجزئة الذين يشترون بالجملة.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="اسم الجهة" required className="sm:col-span-2">
            <Input value={form.entityName} onChange={(e) => set({ entityName: e.target.value })} placeholder="مثال: مصنع النخبة للألبان" />
          </Field>
          <Field label="نوع العميل">
            <Select value={form.entityType} onValueChange={(v) => set({ entityType: v as CustomerType })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CUSTOMER_TYPE_LABELS) as CustomerType[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {CUSTOMER_TYPE_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="رقم الهاتف" required>
            <Input dir="ltr" value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="021-xxxxxxx" />
          </Field>
          <Field label="الرقم الضريبي" hint="اختياري">
            <Input dir="ltr" value={form.taxNumber} onChange={(e) => set({ taxNumber: e.target.value })} />
          </Field>
          <Field label="فئة السعر">
            <Select value={form.priceTier} onValueChange={(v) => set({ priceTier: v as PriceTier })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PRICE_TIER_LABELS) as PriceTier[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {PRICE_TIER_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="حد الائتمان (د.ل)">
            <Input type="number" dir="ltr" value={form.creditLimit} onChange={(e) => set({ creditLimit: e.target.value })} placeholder="0" />
          </Field>
          <Field label="مدة السداد (يوم)">
            <Input type="number" dir="ltr" value={form.paymentTerms} onChange={(e) => set({ paymentTerms: e.target.value })} placeholder="30" />
          </Field>
          <Field label="سعر البيع الافتراضي (د.ل/لتر)">
            <Input type="number" dir="ltr" step="0.001" value={form.defaultSellPrice} onChange={(e) => set({ defaultSellPrice: e.target.value })} />
          </Field>
          <Field label="ملاحظات" hint="اختياري" className="sm:col-span-2">
            <Input value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 sm:col-span-2">
            <div>
              <Label className="text-[13px]">تجميد الحساب</Label>
              <p className="text-[11.5px] text-muted-foreground">يمنع تسجيل مبيعات جديدة لهذا العميل.</p>
            </div>
            <Switch checked={form.onHold} onCheckedChange={(v) => set({ onHold: v })} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={saving}>{saving ? 'جارٍ الحفظ…' : isEdit ? 'حفظ التعديلات' : 'إضافة العميل'}</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
