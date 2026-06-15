'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Receipt, Plus, TrendingDown, PieChart, Layers, Wallet, Landmark, AlertCircle, Tags, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { AccessGate } from '@/components/shared/access-gate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/shared/field';
import { Money, moneyText } from '@/components/shared/money';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useErpStore } from '@/lib/store/use-erp-store';
import { usePermission } from '@/lib/store/use-permission';
import { computeExpenseTotals, accountLabel, accountBalance } from '@/lib/domain/treasury';
import { EXPENSE_GROUP_LABELS, EXPENSE_STATUS_LABELS } from '@/lib/domain/constants';
import { sessionDisplayLabel } from '@/lib/domain/cycle';
import { DEFAULT_EXPENSE_CATEGORIES } from '@/lib/store/seed-v3';
import type { AccountSourceType, BankAccount, CashMovement, CashVault, Expense, ExpenseStatus, Session } from '@/lib/domain/types';
import { cn, formatShortDate } from '@/lib/utils';
import { RowDeleteButton } from '@/components/shared/row-delete-button';
import { ExpenseCategoriesDialog } from '@/components/expenses/expense-categories-dialog';
import { ExpenseEditDialog } from '@/components/expenses/expense-edit-dialog';

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
  const categoriesRaw = useErpStore((s) => s.expenseCategories);
  const vaults = useErpStore((s) => s.vaults);
  const banks = useErpStore((s) => s.banks);
  const cashMovements = useErpStore((s) => s.cashMovements);
  const sales = useErpStore((s) => s.sales);
  const activeSessionId = useErpStore((s) => s.activeSessionId);
  const sessions = useErpStore((s) => s.sessions);
  const recordExpense = useErpStore((s) => s.recordExpense);
  const deleteExpense = useErpStore((s) => s.deleteExpense);
  const setupMainVault = useErpStore((s) => s.setupMainVault);
  const canManageVaults = usePermission('vaults.manage');

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const sessionOpen = activeSession?.status === 'open';
  const openSessions = useMemo(
    () => sessions.filter((s) => s.status === 'open').sort((a, b) => b.periodFrom.localeCompare(a.periodFrom)),
    [sessions],
  );

  const [sessionFilterId, setSessionFilterId] = useState(() => activeSessionId);
  useEffect(() => {
    if (sessionFilterId === 'all') return;
    if (!sessions.some((s) => s.id === sessionFilterId)) {
      setSessionFilterId(activeSessionId);
    }
  }, [activeSessionId, sessionFilterId, sessions]);

  const filteredExpenses = useMemo(() => {
    if (sessionFilterId === 'all') return expenses;
    return expenses.filter((e) => e.sessionId === sessionFilterId);
  }, [expenses, sessionFilterId]);

  const categories = categoriesRaw.length ? categoriesRaw : DEFAULT_EXPENSE_CATEGORIES;
  const hasAccounts = vaults.length + banks.length > 0;
  const totals = useMemo(() => computeExpenseTotals(filteredExpenses, categories), [filteredExpenses, categories]);
  const revenue = useMemo(() => {
    const sid = sessionFilterId === 'all' ? activeSessionId : sessionFilterId;
    return sales.filter((s) => s.sessionId === sid).reduce((acc, s) => acc + s.total, 0);
  }, [sales, sessionFilterId, activeSessionId]);
  const ratio = revenue > 0 ? (totals.total / revenue) * 100 : 0;
  const pendingCount = filteredExpenses.filter((e) => e.status === 'pending').length;
  const top = totals.byCategory[0];
  const filterSession = sessionFilterId === 'all' ? null : sessions.find((s) => s.id === sessionFilterId);

  const sortedExpenses = useMemo(
    () => [...filteredExpenses].sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [filteredExpenses],
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="المالية"
        title="المصاريف"
        description="تسجيل وتصنيف المصاريف التشغيلية — كل مصروف يُخصم فوراً من خزنة أو بنك."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setCategoriesOpen(true)}>
              <Tags className="h-4 w-4" />
              التصنيفات
            </Button>
            <Button type="button" className="w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              تسجيل مصروف
            </Button>
          </div>
        }
      />

      {!sessionOpen ? (
        <Card className="border-rose-200 bg-rose-50/60">
          <CardContent className="flex gap-3 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <AlertCircle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[14px] font-semibold text-foreground">لا توجد دورة نشطة</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                {activeSession?.status === 'archived'
                  ? 'الدورة الحالية مؤرشفة — اختر دورة «نشطة» من شريط الأعلى أو أغلق الدورة لفتح دورة جديدة.'
                  : 'يجب وجود دورة مفتوحة لتسجيل المصاريف. اختر دورة من شريط الأعلى.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {openSessions.length > 1 ? (
        <Card className="border-sun-200 bg-sun-50/50">
          <CardContent className="flex gap-3 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sun-100 text-sun-700">
              <AlertCircle className="h-4 w-4" />
            </span>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">يوجد أكثر من دورة مفتوحة.</span>{' '}
              عند تسجيل أي مصروف اختر الدورة التي ينتمي إليها — وإلا قد يُحسب في الدورة الخاطئة.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!hasAccounts ? (
        <Card className="border-sun-200 bg-sun-50/60">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sun-100 text-sun-700">
                <AlertCircle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[14px] font-semibold text-foreground">يجب إعداد خزنة أولاً</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  اضغط «تسجيل مصروف» — سيُطلب منك إنشاء خزنة برصيد افتتاحي ثم تسجيل المصروف مباشرة.
                </p>
              </div>
            </div>
            {canManageVaults ? (
              <Button variant="outline" type="button" asChild>
                <Link href="/treasury">
                  <Landmark className="h-4 w-4" />
                  صفحة الخزينة
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="إجمالي المصاريف" value={<Money value={totals.total} decimals={0} />} icon={Receipt} tone="rose" hint={`${filteredExpenses.length} مصروف${filterSession ? ` · ${sessionDisplayLabel(filterSession, 'compact')}` : ''}`} />
        <StatTile label="نسبة من الإيرادات" value={`${ratio.toFixed(1)}%`} icon={TrendingDown} tone="sun" hint={filterSession ? `مصاريف ÷ إيرادات ${sessionDisplayLabel(filterSession, 'compact')}` : 'مصاريف ÷ إيرادات الدورة'} />
        <StatTile label="أعلى تصنيف" value={top ? top.name : '—'} icon={PieChart} tone="navy" hint={top ? moneyText(top.amount, 0) : 'لا يوجد'} />
        <StatTile label="قيد المراجعة" value={pendingCount} icon={Layers} tone={pendingCount ? 'sun' : 'neutral'} hint="مصاريف معلّقة" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
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
                          الميزانية: <Money value={c.budget} decimals={0} muted /> {over ? '· تجاوز' : ''}
                        </p>
                      </>
                    ) : null}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>سجل المصاريف</CardTitle>
              <CardDescription>
                {sessionFilterId === 'all' ? 'كل الدورات' : filterSession ? sessionDisplayLabel(filterSession, 'full') : '—'} · {sortedExpenses.length} مصروف
              </CardDescription>
            </div>
            <Select value={sessionFilterId} onValueChange={setSessionFilterId}>
              <SelectTrigger className="sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الدورات</SelectItem>
                {sessions
                  .slice()
                  .sort((a, b) => b.periodFrom.localeCompare(a.periodFrom))
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {sessionDisplayLabel(s, 'compact')}
                      {s.status === 'archived' ? ' (مؤرشفة)' : ''}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {sortedExpenses.length === 0 ? (
              <EmptyState icon={Receipt} title="لا توجد مصاريف" description="ابدأ بتسجيل أول مصروف." />
            ) : (
              <>
                <div className="space-y-2.5 md:hidden">
                  {sortedExpenses.map((e) => {
                    const cat = categories.find((c) => c.id === e.categoryId);
                    const expenseSession = sessions.find((s) => s.id === e.sessionId);
                    return (
                      <article key={e.id} className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-semibold">{cat?.name ?? 'مصروف'}</p>
                            {expenseSession ? (
                              <p className="mt-0.5 text-[11px] text-meadow-700">{sessionDisplayLabel(expenseSession, 'compact')}</p>
                            ) : null}
                            {e.description ? (
                              <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">{e.description}</p>
                            ) : null}
                            <p className="mt-1.5 text-[11px] text-muted-foreground">
                              {e.nonCash || !e.paidFromType || !e.paidFromId
                                ? 'غير نقدي · هدر مخزون'
                                : accountLabel(e.paidFromType, e.paidFromId, vaults, banks)}
                            </p>
                          </div>
                          <Money value={e.amount} decimals={0} className="shrink-0 text-[15px] font-bold text-rose-600" />
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={STATUS_VARIANT[e.status]}>{EXPENSE_STATUS_LABELS[e.status]}</Badge>
                            <span className="text-[11px] text-muted-foreground" dir="ltr">{formatShortDate(e.date)}</span>
                          </div>
                          {e.nonCash ? (
                            <Link href="/inventory" className="text-[11px] font-medium text-meadow-700">
                              من تسوية مخزون ←
                            </Link>
                          ) : e.sourcePayrollBatchId ? (
                            <Link href="/hr" className="text-[11px] font-medium text-meadow-700">
                              من كشف رواتب ←
                            </Link>
                          ) : (
                            <div className="flex gap-1">
                              <Button type="button" size="icon" variant="ghost" className="h-9 w-9" onClick={() => setEditExpense(e)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <RowDeleteButton
                                label={e.ref}
                                onConfirm={async () => {
                                  const res = await deleteExpense(e.id);
                                  if (res.ok) toast.success('تم حذف المصروف');
                                  else toast.error(res.error ?? 'تعذّر الحذف');
                                  return res;
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
                <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>البيان</TableHead>
                    <TableHead>الدورة</TableHead>
                    <TableHead>المصدر</TableHead>
                    <TableHead className="text-left">المبلغ</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">التاريخ</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedExpenses.map((e) => {
                    const cat = categories.find((c) => c.id === e.categoryId);
                    const expenseSession = sessions.find((s) => s.id === e.sessionId);
                    return (
                      <TableRow key={e.id}>
                        <TableCell>
                          <p className="text-[12.5px] font-medium">{cat?.name ?? 'مصروف'}</p>
                          <p className="max-w-[200px] truncate text-[11px] text-muted-foreground">{e.description}</p>
                        </TableCell>
                        <TableCell className="text-[11.5px] text-muted-foreground">
                          {expenseSession ? sessionDisplayLabel(expenseSession, 'compact') : '—'}
                        </TableCell>
                        <TableCell className="text-[12px] text-muted-foreground">
                          {e.nonCash || !e.paidFromType || !e.paidFromId
                            ? 'غير نقدي · هدر مخزون'
                            : accountLabel(e.paidFromType, e.paidFromId, vaults, banks)}
                          {e.sourcePayrollBatchId ? (
                            <Badge variant="neutral" className="mr-1.5 font-normal">راتب</Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-left"><Money value={e.amount} decimals={0} className="font-semibold text-rose-600" /></TableCell>
                        <TableCell><Badge variant={STATUS_VARIANT[e.status]}>{EXPENSE_STATUS_LABELS[e.status]}</Badge></TableCell>
                        <TableCell className="text-left text-[12px] text-muted-foreground" dir="ltr">{formatShortDate(e.date)}</TableCell>
                        <TableCell>
                          {e.nonCash ? (
                            <Link href="/inventory" className="flex justify-end text-[11px] font-medium text-meadow-700">
                              من تسوية مخزون ←
                            </Link>
                          ) : e.sourcePayrollBatchId ? (
                            <Link href="/hr" className="flex justify-end text-[11px] font-medium text-meadow-700">
                              من كشف رواتب ←
                            </Link>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditExpense(e)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <RowDeleteButton
                                label={e.ref}
                                onConfirm={async () => {
                                  const res = await deleteExpense(e.id);
                                  if (res.ok) toast.success('تم حذف المصروف');
                                  else toast.error(res.error ?? 'تعذّر الحذف');
                                  return res;
                                }}
                              />
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <ExpenseRecordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        hasAccounts={hasAccounts}
        openSessions={openSessions}
        activeSessionId={activeSessionId}
        categories={categories}
        vaults={vaults}
        banks={banks}
        cashMovements={cashMovements}
        setupMainVault={setupMainVault}
        recordExpense={recordExpense}
      />
      <ExpenseEditDialog
        open={!!editExpense}
        onOpenChange={(o) => !o && setEditExpense(null)}
        expense={editExpense}
        categories={categories}
        openSessions={openSessions}
      />
      <ExpenseCategoriesDialog open={categoriesOpen} onOpenChange={setCategoriesOpen} />
    </div>
  );
}

/** حوار موحّد: إعداد خزنة (إن لزم) ثم تسجيل المصروف */
function ExpenseRecordDialog({
  open,
  onOpenChange,
  hasAccounts,
  openSessions,
  activeSessionId,
  categories,
  vaults,
  banks,
  cashMovements,
  setupMainVault,
  recordExpense,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hasAccounts: boolean;
  openSessions: Session[];
  activeSessionId: string;
  categories: { id: string; name: string }[];
  vaults: CashVault[];
  banks: BankAccount[];
  cashMovements: CashMovement[];
  setupMainVault: (input: { openingBalance: number; name?: string }) => Promise<{ ok: boolean; error?: string; id?: string }>;
  recordExpense: (input: {
    categoryId: string;
    amount: number;
    description: string;
    paidFromType: AccountSourceType;
    paidFromId: string;
    invoiceRef?: string;
    sessionId?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [step, setStep] = useState<'setup' | 'expense'>(hasAccounts ? 'expense' : 'setup');
  const [vaultName, setVaultName] = useState('الخزنة الرئيسية');
  const [opening, setOpening] = useState('10000');
  const [categoryId, setCategoryId] = useState('');
  const [sessionId, setSessionId] = useState(activeSessionId);
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [account, setAccount] = useState('');
  const [invoice, setInvoice] = useState('');
  const [busy, setBusy] = useState(false);

  const accountOptions = useMemo(
    () => [
      ...vaults.filter((v) => v.isActive).map((v) => ({ value: `vault:${v.id}`, label: `خزنة: ${v.name}`, type: 'vault' as const, id: v.id })),
      ...banks.filter((b) => b.isActive).map((b) => ({ value: `bank:${b.id}`, label: `بنك: ${b.bankName}`, type: 'bank' as const, id: b.id })),
    ],
    [vaults, banks],
  );

  useEffect(() => {
    if (!open) return;
    setStep(hasAccounts ? 'expense' : 'setup');
    if (categories[0]) setCategoryId(categories[0].id);
    if (accountOptions[0]) setAccount(accountOptions[0].value);
    const defaultSession =
      openSessions.find((s) => s.id === activeSessionId)?.id ?? openSessions[0]?.id ?? activeSessionId;
    setSessionId(defaultSession);
  }, [open, hasAccounts, categories, accountOptions, openSessions, activeSessionId]);

  const selectedSession = openSessions.find((s) => s.id === sessionId);

  const selected = accountOptions.find((o) => o.value === account);
  const balance = selected
    ? accountBalance(selected.type, selected.id, vaults, banks, cashMovements)
    : 0;
  const amountNum = Number(amount) || 0;

  function close() {
    onOpenChange(false);
    setAmount('');
    setDesc('');
    setInvoice('');
  }

  function handleSetup() {
    const bal = Number(opening) || 0;
    if (bal <= 0) return toast.error('أدخل رصيداً افتتاحياً أكبر من صفر.');
    setBusy(true);
    void (async () => {
      try {
        const res = await setupMainVault({ openingBalance: bal, name: vaultName.trim() || undefined });
        if (!res.ok) return toast.error(res.error ?? 'تعذّر إعداد الخزنة');
        toast.success('تم إعداد الخزنة', { description: moneyText(bal, 0) });
        if (res.id) setAccount(`vault:${res.id}`);
        setStep('expense');
      } finally {
        setBusy(false);
      }
    })();
  }

  async function handleExpense() {
    if (!openSessions.length) return toast.error('لا توجد دورة مفتوحة — أنشئ أو اختر دورة نشطة.');
    if (!sessionId) return toast.error('اختر الدورة التي ينتمي إليها المصروف.');
    if (!categoryId) return toast.error('اختر التصنيف');
    if (!account) return toast.error('اختر مصدر الصرف');
    if (!desc.trim()) return toast.error('أدخل بيان المصروف');
    if (amountNum <= 0) return toast.error('أدخل مبلغاً أكبر من صفر');
    if (amountNum > balance + 0.001) {
      return toast.error(`الرصيد المتاح ${moneyText(balance, 0)} — لا يكفي`);
    }
    setBusy(true);
    try {
      const [paidFromType, paidFromId] = account.split(':') as [AccountSourceType, string];
      const res = await recordExpense({
        categoryId,
        amount: amountNum,
        description: desc.trim(),
        paidFromType,
        paidFromId,
        invoiceRef: invoice.trim() || undefined,
        sessionId,
      });
      if (res.ok) {
        toast.success('تم تسجيل المصروف', { description: moneyText(amountNum, 0) });
        close();
      } else toast.error(res.error ?? 'تعذّر التسجيل');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-md">
        {step === 'setup' ? (
          <>
            <DialogHeader>
              <DialogTitle>إعداد الخزنة</DialogTitle>
              <DialogDescription>خطوة واحدة قبل تسجيل المصروف — أدخل الرصيد الافتتاحي.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Field label="اسم الخزنة">
                <Input value={vaultName} onChange={(e) => setVaultName(e.target.value)} placeholder="الخزنة الرئيسية" />
              </Field>
              <Field label="الرصيد الافتتاحي" required>
                <AmountInput value={opening} onChange={setOpening} placeholder="10000" />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="meadow" disabled={busy} onClick={handleSetup}>
                <Wallet className="h-4 w-4" />
                متابعة لتسجيل المصروف
              </Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={close}>إلغاء</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>تسجيل مصروف</DialogTitle>
              <DialogDescription>يُخصم المبلغ فوراً من الحساب المختار.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Field label="الدورة / الفترة" required hint="الدورة التي يُحسب فيها هذا المصروف">
                <Select value={sessionId} onValueChange={setSessionId}>
                  <SelectTrigger><SelectValue placeholder="اختر الدورة" /></SelectTrigger>
                  <SelectContent>
                    {openSessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {sessionDisplayLabel(s, 'full')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSession ? (
                  <p className="text-[11px] text-muted-foreground">
                    من {selectedSession.periodFrom} إلى {selectedSession.periodTo}
                  </p>
                ) : null}
              </Field>
              <Field label="التصنيف" required>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="البيان" required>
                <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="وصف المصروف" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="المبلغ" required>
                  <AmountInput value={amount} onChange={setAmount} />
                </Field>
                <Field label="رقم الفاتورة">
                  <Input dir="ltr" value={invoice} onChange={(e) => setInvoice(e.target.value)} placeholder="اختياري" />
                </Field>
              </div>
              <Field label="مصدر الصرف" required>
                <Select value={account} onValueChange={setAccount}>
                  <SelectTrigger><SelectValue placeholder="خزنة أو بنك" /></SelectTrigger>
                  <SelectContent>
                    {accountOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selected ? (
                  <p className="text-[11px] text-muted-foreground">
                    الرصيد: <Money value={balance} decimals={0} className="font-semibold" />
                  </p>
                ) : null}
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="meadow" disabled={busy || !openSessions.length || !sessionId || !accountOptions.length} onClick={handleExpense}>
                <Wallet className="h-4 w-4" />
                {busy ? 'جارٍ الحفظ…' : 'تسجيل المصروف'}
              </Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={close}>إلغاء</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
