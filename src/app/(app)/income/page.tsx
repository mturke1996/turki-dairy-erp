'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Plus, TrendingUp, Wallet, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/shared/field';
import { Money } from '@/components/shared/money';
import { AmountInput } from '@/components/shared/amount-input';
import { StatTile } from '@/components/shared/stat-tile';
import { EmptyState } from '@/components/shared/empty-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useErpStore } from '@/lib/store/use-erp-store';
import { useDerived } from '@/lib/store/use-derived';
import { accountLabel } from '@/lib/domain/treasury';
import { TurkiPdfToolbar } from '@/features/pdf/pdf-toolbar';
import { ExternalIncomePDF } from '@/features/pdf/ExternalIncomePDF';
import type { AccountSourceType, ExternalIncome } from '@/lib/domain/types';
import { formatShortDate } from '@/lib/utils';

export default function IncomePage() {
  return <IncomeContent />;
}

function IncomeContent() {
  const d = useDerived();
  const externalIncomes = useErpStore((s) => s.externalIncomes);
  const vaults = useErpStore((s) => s.vaults);
  const banks = useErpStore((s) => s.banks);
  const recordExternalIncome = useErpStore((s) => s.recordExternalIncome);
  const updateExternalIncome = useErpStore((s) => s.updateExternalIncome);
  const deleteExternalIncome = useErpStore((s) => s.deleteExternalIncome);
  const setupMainVault = useErpStore((s) => s.setupMainVault);

  const sorted = useMemo(
    () => [...externalIncomes].sort((a, b) => b.date.localeCompare(a.date)),
    [externalIncomes],
  );
  const total = useMemo(() => sorted.reduce((s, i) => s + i.amount, 0), [sorted]);

  const pdfRows = useMemo(
    () =>
      sorted.map((i) => ({
        ref: i.ref,
        date: i.date,
        description: i.description,
        destination: accountLabel(i.destinationType, i.destinationId, vaults, banks),
        amount: i.amount,
      })),
    [sorted, vaults, banks],
  );

  const accounts = useMemo(
    () => [
      ...vaults.filter((v) => v.isActive).map((v) => ({ type: 'vault' as const, id: v.id, label: accountLabel('vault', v.id, vaults, banks) })),
      ...banks.filter((b) => b.isActive).map((b) => ({ type: 'bank' as const, id: b.id, label: accountLabel('bank', b.id, vaults, banks) })),
    ],
    [vaults, banks],
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ExternalIncome | null>(null);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dest, setDest] = useState('');
  const [busy, setBusy] = useState(false);

  function openNew() {
    setEditItem(null);
    setDesc('');
    setAmount('');
    setDate(new Date().toISOString().slice(0, 10));
    setDest(accounts[0] ? `${accounts[0].type}:${accounts[0].id}` : '');
    setDialogOpen(true);
  }

  function openEdit(item: ExternalIncome) {
    setEditItem(item);
    setDesc(item.description);
    setAmount(String(item.amount));
    setDate(item.date.slice(0, 10));
    setDest(`${item.destinationType}:${item.destinationId}`);
    setDialogOpen(true);
  }

  async function submit() {
    const val = Number(amount) || 0;
    if (val <= 0) return toast.error('أدخل المبلغ.');
    if (!desc.trim()) return toast.error('أدخل وصف المدخول.');
    if (!dest) return toast.error('اختر الخزينة أو البنك.');
    const [type, id] = dest.split(':') as [AccountSourceType, string];
    setBusy(true);
    try {
      const res = editItem
        ? await updateExternalIncome(editItem.id, {
            amount: val,
            description: desc.trim(),
            date: new Date(date + 'T12:00:00').toISOString(),
          })
        : await recordExternalIncome({
            amount: val,
            description: desc.trim(),
            destinationType: type,
            destinationId: id,
            date: new Date(date + 'T12:00:00').toISOString(),
          });
      if (res.ok) {
        toast.success(editItem ? 'تم التحديث' : 'تم تسجيل المدخول');
        setDialogOpen(false);
      } else toast.error(res.error ?? 'تعذّر الحفظ');
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: ExternalIncome) {
    if (!confirm(`حذف المدخول ${item.ref}؟`)) return;
    const res = await deleteExternalIncome(item.id);
    if (res.ok) toast.success('تم الحذف');
    else toast.error(res.error ?? 'تعذّر الحذف');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="المالية"
        title="مدخول خارج الخدمة"
        description="إيرادات خارج استلام الحليب والمبيعات — تُرحّل مباشرة للخزينة أو البنك."
        actions={
          <div className="flex flex-wrap gap-2">
            <TurkiPdfToolbar
              fileName="مدخول-خارج-الخدمة"
              label="PDF"
              variant="secondary"
              disabled={sorted.length === 0}
              render={async () => (
                <ExternalIncomePDF sessionLabel={d.activeSession?.label} total={total} rows={pdfRows} />
              )}
            />
            <Button type="button" variant="outline" asChild>
              <Link href="/treasury">
                <Wallet className="h-4 w-4" />
                الخزينة
              </Link>
            </Button>
            <Button type="button" onClick={openNew} disabled={!accounts.length}>
              <Plus className="h-4 w-4" />
              تسجيل مدخول
            </Button>
          </div>
        }
      />

      {!accounts.length ? (
        <Card className="border-sun-200 bg-sun-50/50">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px]">لا توجد خزنة — أنشئ خزنة رئيسية أولاً.</p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void (async () => {
                  const r = await setupMainVault({ openingBalance: 0 });
                  if (r.ok) toast.success('تم إنشاء الخزنة');
                  else toast.error(r.error ?? 'تعذّر الإنشاء');
                })();
              }}
            >
              <Wallet className="h-4 w-4" />
              إنشاء خزنة
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile label="إجمالي المدخولات" value={<Money value={total} decimals={0} />} icon={TrendingUp} tone="meadow" />
        <StatTile label="عدد العمليات" value={sorted.length} icon={Wallet} tone="neutral" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">سجل المدخولات</CardTitle>
          <CardDescription>{sorted.length} عملية</CardDescription>
        </CardHeader>
        <CardContent>
          {sorted.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الوصف</TableHead>
                  <TableHead>الوجهة</TableHead>
                  <TableHead className="text-left">المبلغ</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.description}</p>
                      <p className="font-mono text-[10px] text-muted-foreground" dir="ltr">
                        {item.ref}
                      </p>
                    </TableCell>
                    <TableCell className="text-[12px]">
                      {accountLabel(item.destinationType, item.destinationId, vaults, banks)}
                    </TableCell>
                    <TableCell className="text-left">
                      <Money value={item.amount} decimals={0} className="font-bold text-meadow-700" />
                    </TableCell>
                    <TableCell className="text-[12px]">{formatShortDate(item.date)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => remove(item)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={TrendingUp} title="لا مدخولات بعد" description="سجّل أول مدخول خارج الخدمة." />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? 'تعديل مدخول' : 'تسجيل مدخول خارجي'}</DialogTitle>
            <DialogDescription>يُضاف فوراً لرصيد الخزينة أو البنك المختار.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="الوصف" required>
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="مثال: بيع معدات، إيجار…" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="المبلغ" required>
                <AmountInput value={amount} onChange={setAmount} />
              </Field>
              <Field label="التاريخ" required>
                <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </div>
            {!editItem ? (
              <Field label="الخزينة / البنك" required>
                <Select value={dest} onValueChange={setDest}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحساب" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={`${a.type}:${a.id}`} value={`${a.type}:${a.id}`}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" onClick={submit} disabled={busy}>
              {busy ? 'جارٍ الحفظ…' : 'حفظ'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
