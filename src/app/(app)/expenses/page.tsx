'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Receipt, Plus, TrendingDown, PieChart, Layers, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { AccessGate } from '@/components/shared/access-gate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/shared/field';
import { Money } from '@/components/shared/money';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useErpStore } from '@/lib/store/use-erp-store';
import { computeExpenseTotals, accountLabel } from '@/lib/domain/treasury';
import { EXPENSE_GROUP_LABELS, EXPENSE_STATUS_LABELS } from '@/lib/domain/constants';
import type { AccountSourceType, ExpenseStatus } from '@/lib/domain/types';
import { cn, formatShortDate } from '@/lib/utils';

const STATUS_VARIANT: Record<ExpenseStatus, 'success' | 'warning' | 'danger'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
};

export default function ExpensesPage() {
  return (
    <AccessGate permission="expenses.record">
      <ExpensesContent />
    </AccessGate>
  );
}

function ExpensesContent() {
  const expenses = useErpStore((s) => s.expenses);
  const categories = useErpStore((s) => s.expenseCategories);
  const vaults = useErpStore((s) => s.vaults);
  const banks = useErpStore((s) => s.banks);
  const sales = useErpStore((s) => s.sales);
  const activeSessionId = useErpStore((s) => s.activeSessionId);
  const recordExpense = useErpStore((s) => s.recordExpense);

  const totals = useMemo(() => computeExpenseTotals(expenses, categories), [expenses, categories]);
  const revenue = useMemo(
    () => sales.filter((s) => s.sessionId === activeSessionId).reduce((acc, s) => acc + s.total, 0),
    [sales, activeSessionId],
  );
  const ratio = revenue > 0 ? (totals.total / revenue) * 100 : 0;
  const pendingCount = expenses.filter((e) => e.status === 'pending').length;
  const top = totals.byCategory[0];

  const sortedExpenses = useMemo(
    () => [...expenses].sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [expenses],
  );

  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="المالية"
        title="المصاريف"
        description="تسجيل وتصنيف المصاريف التشغيلية — كل مصروف يُخصم فوراً من خزنة أو بنك."
        actions={
          <Button onClick={() => setOpen(true)} disabled={vaults.length + banks.length === 0}>
            <Plus className="h-4 w-4" />
            تسجيل مصروف
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="إجمالي المصاريف" value={<Money value={totals.total} decimals={0} />} icon={Receipt} tone="rose" hint={`${expenses.length} مصروف`} />
        <StatTile label="نسبة من الإيرادات" value={`${ratio.toFixed(1)}%`} icon={TrendingDown} tone="sun" hint="مصاريف ÷ إيرادات الدورة" />
        <StatTile label="أعلى تصنيف" value={top ? top.name : '—'} icon={PieChart} tone="navy" hint={top ? `${top.amount.toLocaleString('en-US')} د.ل` : 'لا يوجد'} />
        <StatTile label="قيد المراجعة" value={pendingCount} icon={Layers} tone={pendingCount ? 'sun' : 'neutral'} hint="مصاريف معلّقة" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* تحليل التصنيفات */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>المصاريف حسب التصنيف</CardTitle>
            <CardDescription>الفعلي مقابل الميزانية الشهرية</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {totals.byCategory.length === 0 ? (
              <EmptyState icon={PieChart} title="لا مصاريف بعد" />
            ) : (
              totals.byCategory.map((c) => {
                const pct = c.budget && c.budget > 0 ? Math.min(100, (c.amount / c.budget) * 100) : 0;
                const over = c.budget !== undefined && c.amount > c.budget;
                return (
                  <div key={c.categoryId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span className="flex items-center gap-1.5 font-medium">
                        {c.name}
                        <Badge variant="neutral" className="font-normal">{EXPENSE_GROUP_LABELS[c.group as keyof typeof EXPENSE_GROUP_LABELS]}</Badge>
                      </span>
                      <Money value={c.amount} decimals={0} className="font-semibold" />
                    </div>
                    {c.budget ? (
                      <>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas-sunken">
                          <div className={cn('h-full rounded-full', over ? 'bg-rose-500' : 'bg-meadow-500')} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10.5px] text-muted-foreground">
                          الميزانية: {c.budget.toLocaleString('en-US')} د.ل {over ? '· تجاوز' : ''}
                        </p>
                      </>
                    ) : null}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* جدول المصاريف */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>سجل المصاريف</CardTitle>
            <CardDescription>كل المصاريف المسجّلة مرتّبة بالأحدث</CardDescription>
          </CardHeader>
          <CardContent>
            {sortedExpenses.length === 0 ? (
              <EmptyState icon={Receipt} title="لا توجد مصاريف" description="ابدأ بتسجيل أول مصروف." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>البيان</TableHead>
                    <TableHead>المصدر</TableHead>
                    <TableHead className="text-left">المبلغ</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedExpenses.map((e) => {
                    const cat = categories.find((c) => c.id === e.categoryId);
                    return (
                      <TableRow key={e.id}>
                        <TableCell>
                          <p className="text-[12.5px] font-medium">{cat?.name ?? 'مصروف'}</p>
                          <p className="max-w-[200px] truncate text-[11px] text-muted-foreground">{e.description}</p>
                        </TableCell>
                        <TableCell className="text-[12px] text-muted-foreground">{accountLabel(e.paidFromType, e.paidFromId, vaults, banks)}</TableCell>
                        <TableCell className="text-left"><Money value={e.amount} decimals={0} className="font-semibold text-rose-600" /></TableCell>
                        <TableCell><Badge variant={STATUS_VARIANT[e.status]}>{EXPENSE_STATUS_LABELS[e.status]}</Badge></TableCell>
                        <TableCell className="text-left text-[12px] text-muted-foreground" dir="ltr">{formatShortDate(e.date)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <ExpenseDialog
        open={open}
        onOpenChange={setOpen}
        categories={categories}
        vaults={vaults}
        banks={banks}
        onSubmit={(input) => {
          const res = recordExpense(input);
          if (res.ok) {
            toast.success('تم تسجيل المصروف');
            setOpen(false);
          } else toast.error(res.error ?? 'تعذّر التسجيل');
        }}
      />
    </div>
  );
}

function ExpenseDialog({
  open,
  onOpenChange,
  categories,
  vaults,
  banks,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: { id: string; name: string }[];
  vaults: { id: string; name: string }[];
  banks: { id: string; bankName: string }[];
  onSubmit: (input: { categoryId: string; amount: number; description: string; paidFromType: AccountSourceType; paidFromId: string; invoiceRef?: string }) => void;
}) {
  const accountOptions = useMemo(
    () => [
      ...vaults.map((v) => ({ value: `vault:${v.id}`, label: `خزنة: ${v.name}` })),
      ...banks.map((b) => ({ value: `bank:${b.id}`, label: `بنك: ${b.bankName}` })),
    ],
    [vaults, banks],
  );
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [account, setAccount] = useState('');
  const [invoice, setInvoice] = useState('');

  function submit() {
    if (!categoryId) return toast.error('اختر التصنيف');
    if (!account) return toast.error('اختر مصدر الصرف');
    if (!desc.trim()) return toast.error('أدخل بيان المصروف');
    const [paidFromType, paidFromId] = account.split(':') as [AccountSourceType, string];
    onSubmit({ categoryId, amount: Number(amount) || 0, description: desc.trim(), paidFromType, paidFromId, invoiceRef: invoice.trim() || undefined });
    setCategoryId(''); setAmount(''); setDesc(''); setAccount(''); setInvoice('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تسجيل مصروف</DialogTitle>
          <DialogDescription>سيُخصم المبلغ فوراً من الحساب المختار ويُسجّل في الحركات.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="التصنيف" required>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="اختر تصنيف المصروف" /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="البيان" required>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="وصف المصروف" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="المبلغ" required>
              <Input type="number" inputMode="decimal" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label="رقم الفاتورة">
              <Input dir="ltr" value={invoice} onChange={(e) => setInvoice(e.target.value)} placeholder="اختياري" />
            </Field>
          </div>
          <Field label="مصدر الصرف" required>
            <Select value={account} onValueChange={setAccount}>
              <SelectTrigger><SelectValue placeholder="خزنة أو بنك" /></SelectTrigger>
              <SelectContent>{accountOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={submit}><Wallet className="h-4 w-4" />تسجيل المصروف</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
