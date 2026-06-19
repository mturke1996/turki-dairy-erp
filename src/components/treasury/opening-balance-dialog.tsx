'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Landmark, Wallet, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/shared/field';
import { AmountInput } from '@/components/shared/amount-input';
import { Money, moneyText } from '@/components/shared/money';
import type { AccountSourceType } from '@/lib/domain/types';

type AccountRow = {
  type: AccountSourceType;
  id: string;
  name: string;
  currentBalance: number;
  currentOpening: number;
};

export function OpeningBalanceDialog({
  open,
  onOpenChange,
  accounts,
  onSave,
  onAddVault,
  onAddBank,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: AccountRow[];
  onSave: (rows: { type: AccountSourceType; id: string; openingBalance: number }[]) => void | Promise<void>;
  onAddVault: (input: { name: string; openingBalance: number }) => Promise<{ ok: boolean; error?: string }>;
  onAddBank: (input: { bankName: string; accountNumber: string; accountHolder: string; openingBalance: number }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [note, setNote] = useState('متبقي حتى 30/5 — بداية التسجيل 1/6');
  const [mode, setMode] = useState<'existing' | 'new-vault' | 'new-bank'>('existing');
  const [vaultName, setVaultName] = useState('الخزنة الرئيسية');
  const [bankName, setBankName] = useState('');
  const [bankNumber, setBankNumber] = useState('');
  const [bankHolder, setBankHolder] = useState('مصنع التركي');
  const [newOpening, setNewOpening] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const init: Record<string, string> = {};
    for (const a of accounts) {
      init[`${a.type}:${a.id}`] = String(Math.round(a.currentOpening));
    }
    setValues(init);
    setMode(accounts.length ? 'existing' : 'new-vault');
  }, [open, accounts]);

  function saveExisting() {
    const rows = accounts
      .map((a) => {
        const key = `${a.type}:${a.id}`;
        const opening = Number(values[key]) || 0;
        if (Math.abs(opening - a.currentOpening) < 0.001) return null;
        return { type: a.type, id: a.id, openingBalance: opening };
      })
      .filter(Boolean) as { type: AccountSourceType; id: string; openingBalance: number }[];
    if (!rows.length) return toast.message('لم يتغيّر أي رصيد');
    onSave(rows);
    toast.success('تم ضبط الأرصدة الافتتاحية');
    onOpenChange(false);
  }

  function addNew() {
    const bal = Number(newOpening) || 0;
    if (bal <= 0) return toast.error('أدخل رصيداً افتتاحياً أكبر من صفر');
    setBusy(true);
    void (async () => {
      try {
        const res =
          mode === 'new-vault'
            ? await onAddVault({ name: vaultName.trim() || 'الخزنة الرئيسية', openingBalance: bal })
            : await onAddBank({
                bankName: bankName.trim() || 'مصرف',
                accountNumber: bankNumber.trim() || '0000',
                accountHolder: bankHolder.trim() || 'مصنع التركي',
                openingBalance: bal,
              });
        if (!res.ok) return toast.error(res.error ?? 'تعذّرت الإضافة');
        toast.success('تم إنشاء الحساب', { description: moneyText(bal, 0) });
        setNewOpening('');
        setMode('existing');
      } finally {
        setBusy(false);
      }
    })();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>ضبط أرصدة البداية</DialogTitle>
          <DialogDescription>
            أدخل الأرصدة النقدية والبنكية كما كانت في نهاية الدورة السابقة (مثلاً 30/5) لبدء التسجيل من 1/6.
          </DialogDescription>
        </DialogHeader>

        {accounts.length ? (
          <div className="space-y-3">
            {accounts.map((a) => {
              const key = `${a.type}:${a.id}`;
              return (
                <div key={key} className="rounded-xl border border-border bg-canvas-sunken/40 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-[13px] font-semibold">
                      {a.type === 'vault' ? <Wallet className="h-4 w-4 text-meadow-600" /> : <Landmark className="h-4 w-4 text-navy-600" />}
                      {a.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      الرصيد الحالي: <Money value={a.currentBalance} decimals={0} className="font-semibold" />
                    </span>
                  </div>
                  <Field label="الرصيد الافتتاحي">
                    <AmountInput
                      value={values[key] ?? ''}
                      onChange={(v) => setValues((s) => ({ ...s, [key]: v }))}
                    />
                  </Field>
                </div>
              );
            })}
            <Field label="ملاحظة (اختياري)">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="متبقي حتى 30/5" />
            </Field>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="نوع الحساب">
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={mode === 'new-vault' ? 'meadow' : 'outline'} onClick={() => setMode('new-vault')}>خزنة</Button>
                <Button type="button" size="sm" variant={mode === 'new-bank' ? 'meadow' : 'outline'} onClick={() => setMode('new-bank')}>بنك</Button>
              </div>
            </Field>
            {mode === 'new-vault' ? (
              <Field label="اسم الخزنة">
                <Input value={vaultName} onChange={(e) => setVaultName(e.target.value)} />
              </Field>
            ) : (
              <>
                <Field label="اسم البنك" required>
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="مصرف الجمهورية" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="رقم الحساب"><Input dir="ltr" value={bankNumber} onChange={(e) => setBankNumber(e.target.value)} /></Field>
                  <Field label="صاحب الحساب"><Input value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} /></Field>
                </div>
              </>
            )}
            <Field label="الرصيد الافتتاحي" required>
              <AmountInput value={newOpening} onChange={setNewOpening} placeholder="50000" />
            </Field>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {accounts.length ? (
            <Button type="button" variant="meadow" onClick={saveExisting}>
              <Save className="h-4 w-4" />
              حفظ الأرصدة
            </Button>
          ) : (
            <Button type="button" variant="meadow" disabled={busy} onClick={addNew}>
              <Save className="h-4 w-4" />
              إنشاء الحساب
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
