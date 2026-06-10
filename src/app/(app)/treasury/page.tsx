'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Wallet,
  Landmark,
  ArrowLeftRight,
  Plus,
  AlertTriangle,
  Coins,
  TrendingUp,
  Settings2,
} from 'lucide-react';
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
import { TurkiPdfToolbar } from '@/features/pdf/pdf-toolbar';
import { CashStatementPDF } from '@/features/pdf/CashStatementPDF';
import { OpeningBalanceDialog } from '@/components/treasury/opening-balance-dialog';
import { SettlementSummaryCard } from '@/components/treasury/settlement-summary-card';
import { TreasuryAccountCard } from '@/components/treasury/treasury-account-card';
import { SplitMovementBadge } from '@/components/treasury/split-movement-badge';
import { useErpStore } from '@/lib/store/use-erp-store';
import { useDerived } from '@/lib/store/use-derived';
import { computeTreasury, accountLabel } from '@/lib/domain/treasury';
import { CASH_MOVEMENT_LABELS } from '@/lib/domain/constants';
import type { AccountSourceType, CashMovementType } from '@/lib/domain/types';
import { cn, formatShortDate } from '@/lib/utils';

const MOVEMENT_VARIANT: Record<CashMovementType, 'success' | 'danger' | 'info' | 'warning' | 'neutral'> = {
  income: 'success',
  sale_payment: 'success',
  transfer_in: 'info',
  transfer_out: 'warning',
  expense: 'danger',
  farmer_payout: 'danger',
  salary: 'warning',
  adjustment: 'neutral',
};

type MobileSection = 'overview' | 'accounts' | 'movements';

export default function TreasuryPage() {
  return (
    <AccessGate permission="vaults.manage">
      <TreasuryContent />
    </AccessGate>
  );
}

function TreasuryContent() {
  const d = useDerived();
  const vaults = useErpStore((s) => s.vaults);
  const banks = useErpStore((s) => s.banks);
  const movements = useErpStore((s) => s.cashMovements);
  const recordTransfer = useErpStore((s) => s.recordTransfer);
  const addVault = useErpStore((s) => s.addVault);
  const addBank = useErpStore((s) => s.addBank);
  const setAccountOpeningBalance = useErpStore((s) => s.setAccountOpeningBalance);

  const snap = useMemo(() => computeTreasury(vaults, banks, movements), [vaults, banks, movements]);
  const adjustedPosition = d.adjustedNetPosition;

  const [filter, setFilter] = useState<string>('all');
  const [mobileSection, setMobileSection] = useState<MobileSection>('overview');
  const filteredMovements = useMemo(() => {
    const sorted = [...movements].sort((a, b) => +new Date(b.date) - +new Date(a.date));
    if (filter === 'all') return sorted.slice(0, 20);
    return sorted.filter((m) => m.sourceId === filter).slice(0, 20);
  }, [movements, filter]);

  const [transferOpen, setTransferOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [openingOpen, setOpeningOpen] = useState(false);

  const belowMin = snap.vaults.filter((v) => v.belowMin);

  function selectAccountForMovements(accountId: string) {
    setFilter(accountId);
    setMobileSection('movements');
  }

  function buildStatementProps(accountId: string) {
    const acc = snap.accounts.find((a) => a.id === accountId);
    const accMovs = movements
      .filter((m) => m.sourceId === accountId)
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));
    let bal = acc?.opening ?? 0;
    const rows = accMovs.map((m) => {
      bal += m.direction === 'in' ? m.amount : -m.amount;
      return {
        date: formatShortDate(m.date),
        ref: m.ref,
        typeLabel: CASH_MOVEMENT_LABELS[m.movementType],
        description: m.description,
        direction: m.direction,
        amount: m.amount,
        balance: Math.round(bal * 100) / 100,
      };
    });
    return {
      accountName: acc?.name ?? '',
      accountTypeLabel: acc?.type === 'vault' ? 'خزنة نقدية' : 'حساب بنكي',
      opening: acc?.opening ?? 0,
      totalIn: acc?.inflow ?? 0,
      totalOut: acc?.outflow ?? 0,
      closing: acc?.balance ?? 0,
      rows,
    };
  }

  const statTiles = (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatTile label="رصيد الخزائن" value={<Money value={snap.totalVaults} decimals={0} />} icon={Wallet} tone="meadow" hint={`${snap.vaults.length} خزنة`} />
      <StatTile label="رصيد البنوك" value={<Money value={snap.totalBanks} decimals={0} />} icon={Landmark} tone="navy" hint={`${snap.banks.length} حساب`} />
      <StatTile label="صافي النقد" value={<Money value={snap.total} decimals={0} />} icon={Coins} tone="sun" hint="خزائن + بنوك" />
      <StatTile label="تنبيهات" value={belowMin.length} icon={AlertTriangle} tone={belowMin.length ? 'rose' : 'neutral'} hint="تحت الحد الأدنى" />
    </div>
  );

  const accountsList = (
    <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 xl:grid-cols-3">
      {snap.accounts.length === 0 ? (
        <EmptyState icon={Wallet} title="لا توجد حسابات" description="أضف خزنة أو حساب بنكي للبدء." className="md:col-span-2 xl:col-span-3" />
      ) : (
        snap.accounts.map((acc) => (
          <TreasuryAccountCard
            key={acc.id}
            account={acc}
            compact
            onSelect={() => selectAccountForMovements(acc.id)}
          />
        ))
      )}
    </div>
  );

  const movementFilterChips = (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 no-scrollbar md:hidden">
      <button
        type="button"
        onClick={() => setFilter('all')}
        className={cn(
          'shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors',
          filter === 'all' ? 'bg-navy-800 text-white' : 'bg-muted text-muted-foreground',
        )}
      >
        الكل
      </button>
      {snap.accounts.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => setFilter(a.id)}
          className={cn(
            'shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors',
            filter === a.id ? 'bg-navy-800 text-white' : 'bg-muted text-muted-foreground',
          )}
        >
          {a.name}
        </button>
      ))}
    </div>
  );

  const movementsBody =
    filteredMovements.length === 0 ? (
      <EmptyState icon={Coins} title="لا توجد حركات" description="ستظهر الحركات هنا فور تسجيلها." />
    ) : (
      <>
        <div className="space-y-2.5 md:hidden">
          {filteredMovements.map((m) => (
            <article key={m.id} className="rounded-xl border border-border bg-card p-3.5">
              <div className="flex items-start justify-between gap-2">
                <Badge variant={MOVEMENT_VARIANT[m.movementType]}>{CASH_MOVEMENT_LABELS[m.movementType]}</Badge>
                <Money
                  value={m.amount}
                  decimals={0}
                  className={cn('text-[15px] font-bold', m.direction === 'in' ? 'text-meadow-700' : 'text-rose-600')}
                />
              </div>
              <p className="mt-2 text-[13px] font-medium">{accountLabel(m.sourceType, m.sourceId, vaults, banks)}</p>
              {m.description ? (
                <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">{m.description}</p>
              ) : null}
              <SplitMovementBadge movement={m} allMovements={movements} vaults={vaults} banks={banks} />
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="font-mono" dir="ltr">{m.ref}</span>
                <span dir="ltr">{formatShortDate(m.date)}</span>
              </div>
            </article>
          ))}
        </div>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المرجع</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الحساب</TableHead>
                <TableHead>البيان</TableHead>
                <TableHead className="text-left">المبلغ</TableHead>
                <TableHead className="text-left">التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-[11px] text-muted-foreground" dir="ltr">{m.ref}</TableCell>
                  <TableCell>
                    <Badge variant={MOVEMENT_VARIANT[m.movementType]}>{CASH_MOVEMENT_LABELS[m.movementType]}</Badge>
                  </TableCell>
                  <TableCell className="text-[12.5px]">{accountLabel(m.sourceType, m.sourceId, vaults, banks)}</TableCell>
                  <TableCell className="max-w-[260px] text-[12.5px] text-muted-foreground">
                    <p className="truncate">{m.description}</p>
                    <SplitMovementBadge movement={m} allMovements={movements} vaults={vaults} banks={banks} />
                  </TableCell>
                  <TableCell className="text-left">
                    <Money
                      value={m.amount}
                      decimals={0}
                      className={cn('font-semibold', m.direction === 'in' ? 'text-meadow-700' : 'text-rose-600')}
                    />
                  </TableCell>
                  <TableCell className="text-left text-[12px] text-muted-foreground" dir="ltr">{formatShortDate(m.date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </>
    );

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="المالية"
        title="الخزائن والبنوك"
        description="إدارة النقد والحسابات البنكية — مع الرصيد النهائي بعد تسوية الديون والمخزون."
        actions={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <Button type="button" variant="outline" asChild className="col-span-2 sm:col-span-1">
              <Link href="/income">
                <TrendingUp className="h-4 w-4" />
                <span className="sm:hidden">مدخول</span>
                <span className="hidden sm:inline">مدخول خارج الخدمة</span>
              </Link>
            </Button>
            <Button type="button" variant="secondary" className="text-[12.5px]" onClick={() => setOpeningOpen(true)}>
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">ضبط أرصدة البداية</span>
              <span className="sm:hidden">أرصدة البداية</span>
            </Button>
            <Button type="button" variant="outline" onClick={() => setAccountOpen(true)}>
              <Plus className="h-4 w-4" />
              حساب جديد
            </Button>
            <Button type="button" onClick={() => setTransferOpen(true)} disabled={snap.accounts.length < 2}>
              <ArrowLeftRight className="h-4 w-4" />
              <span className="hidden sm:inline">تحويل بين الحسابات</span>
              <span className="sm:hidden">تحويل</span>
            </Button>
          </div>
        }
      />

      {/* بطاقة ملخص سريع — جوال فقط */}
      <div className="rounded-xl border border-meadow-200/60 bg-gradient-to-br from-card to-meadow-50/40 p-4 md:hidden">
        <p className="text-[11px] font-semibold text-meadow-700">صافي المركز النقدي</p>
        <Money value={snap.total} decimals={0} className="mt-0.5 text-[22px] font-bold" />
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-2 text-[12px]">
          <span className="text-muted-foreground">بعد التسويات</span>
          <Money
            value={adjustedPosition.finalBalance}
            decimals={0}
            className={cn('font-bold', adjustedPosition.finalBalance >= 0 ? 'text-meadow-800' : 'text-rose-700')}
          />
        </div>
      </div>

      {/* تبويبات جوال */}
      <div className="flex gap-1.5 rounded-xl border border-border bg-canvas-sunken/40 p-1 md:hidden">
        {(
          [
            { key: 'overview' as const, label: 'ملخص', count: null },
            { key: 'accounts' as const, label: 'حسابات', count: snap.accounts.length },
            { key: 'movements' as const, label: 'حركات', count: filteredMovements.length },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setMobileSection(tab.key)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1 rounded-lg py-2.5 text-[12.5px] font-semibold transition-colors',
              mobileSection === tab.key
                ? 'bg-card text-foreground shadow-whisper ring-1 ring-border'
                : 'text-muted-foreground',
            )}
          >
            {tab.label}
            {tab.count !== null ? (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                  mobileSection === tab.key ? 'bg-navy-50 text-navy-700' : 'bg-transparent',
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ملخص — إحصائيات + تسوية */}
      <div className={cn('space-y-5', mobileSection !== 'overview' && 'hidden md:block')}>
        <div className="hidden md:block">{statTiles}</div>
        {mobileSection === 'overview' ? (
          <div className="space-y-3 md:hidden">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-meadow-50/70 px-3 py-2.5">
                <p className="text-[10.5px] text-muted-foreground">خزائن</p>
                <Money value={snap.totalVaults} decimals={0} className="text-[15px] font-bold" />
              </div>
              <div className="rounded-lg bg-navy-50/70 px-3 py-2.5">
                <p className="text-[10.5px] text-muted-foreground">بنوك</p>
                <Money value={snap.totalBanks} decimals={0} className="text-[15px] font-bold" />
              </div>
            </div>
            {belowMin.length > 0 ? (
              <p className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {belowMin.length} خزنة تحت الحد الأدنى
              </p>
            ) : null}
          </div>
        ) : null}
        <SettlementSummaryCard position={adjustedPosition} />
      </div>

      {/* الحسابات */}
      <div className={cn(mobileSection !== 'accounts' && 'hidden md:block')}>
        <h2 className="mb-3 text-[13px] font-semibold text-foreground md:mb-3">حسابات الخزائن والبنوك</h2>
        {accountsList}
      </div>

      {/* الحركات */}
      <Card className={cn(mobileSection !== 'movements' && 'hidden md:block')}>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>الحركات النقدية</CardTitle>
            <CardDescription className="hidden sm:block">آخر الحركات على الخزائن والحسابات البنكية</CardDescription>
          </div>
          <div className="hidden w-full flex-col gap-2 sm:flex sm:w-auto sm:flex-row sm:items-center md:flex">
            {filter !== 'all' ? (
              <TurkiPdfToolbar
                fileName={`كشف-حساب-${snap.accounts.find((a) => a.id === filter)?.name ?? ''}`}
                label="كشف حساب"
                variant="outline"
                showDownload={false}
                render={async () => <CashStatementPDF {...buildStatementProps(filter)} />}
              />
            ) : null}
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحسابات</SelectItem>
                {snap.accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {movementFilterChips}
          {filter !== 'all' ? (
            <div className="flex justify-end md:hidden">
              <TurkiPdfToolbar
                fileName={`كشف-حساب-${snap.accounts.find((a) => a.id === filter)?.name ?? ''}`}
                label="كشف حساب PDF"
                variant="outline"
                showDownload={false}
                render={async () => <CashStatementPDF {...buildStatementProps(filter)} />}
              />
            </div>
          ) : null}
          {movementsBody}
        </CardContent>
      </Card>

      <OpeningBalanceDialog
        open={openingOpen}
        onOpenChange={setOpeningOpen}
        accounts={snap.accounts.map((a) => ({
          type: a.type,
          id: a.id,
          name: a.name,
          currentBalance: a.balance,
          currentOpening: a.opening,
        }))}
        onSave={async (rows) => {
          for (const row of rows) {
            const res = await setAccountOpeningBalance(row);
            if (!res.ok) toast.error(res.error ?? 'تعذّر الحفظ');
          }
        }}
        onAddVault={async (input) => {
          const res = await addVault({ ...input, isActive: true, responsible: 'أمين الصندوق', location: 'المقر', minThreshold: 0 });
          if (!res.ok) toast.error(res.error ?? 'تعذّرت الإضافة');
          return res;
        }}
        onAddBank={async (input) => {
          const res = await addBank({ ...input, isActive: true });
          if (!res.ok) toast.error(res.error ?? 'تعذّرت الإضافة');
          return res;
        }}
      />

      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        vaults={vaults}
        banks={banks}
        onSubmit={async (input) => {
          const res = await recordTransfer(input);
          if (res.ok) {
            toast.success('تم تنفيذ التحويل بنجاح');
            setTransferOpen(false);
          } else {
            toast.error(res.error ?? 'تعذّر التحويل');
          }
        }}
      />

      <AccountDialog
        open={accountOpen}
        onOpenChange={setAccountOpen}
        onSubmitVault={async (input) => {
          const res = await addVault(input);
          if (res.ok) {
            toast.success('تمت إضافة الخزنة');
            setAccountOpen(false);
          } else toast.error(res.error ?? 'تعذّرت الإضافة');
        }}
        onSubmitBank={async (input) => {
          const res = await addBank(input);
          if (res.ok) {
            toast.success('تمت إضافة الحساب البنكي');
            setAccountOpen(false);
          } else toast.error(res.error ?? 'تعذّرت الإضافة');
        }}
      />
    </div>
  );
}

function TransferDialog({
  open,
  onOpenChange,
  vaults,
  banks,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vaults: { id: string; name: string }[];
  banks: { id: string; bankName: string }[];
  onSubmit: (input: { fromType: AccountSourceType; fromId: string; toType: AccountSourceType; toId: string; amount: number; referenceDoc?: string; notes?: string }) => void;
}) {
  const options = useMemo(
    () => [
      ...vaults.map((v) => ({ value: `vault:${v.id}`, label: `خزنة: ${v.name}` })),
      ...banks.map((b) => ({ value: `bank:${b.id}`, label: `بنك: ${b.bankName}` })),
    ],
    [vaults, banks],
  );
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [ref, setRef] = useState('');

  function submit() {
    if (!from || !to) return toast.error('اختر حسابي التحويل');
    const [fromType, fromId] = from.split(':') as [AccountSourceType, string];
    const [toType, toId] = to.split(':') as [AccountSourceType, string];
    onSubmit({ fromType, fromId, toType, toId, amount: Number(amount) || 0, referenceDoc: ref.trim() || undefined });
    setFrom(''); setTo(''); setAmount(''); setRef('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تحويل بين الخزائن والبنوك</DialogTitle>
          <DialogDescription>ينشئ حركتين متوازيتين: صادر من المصدر ووارد للوجهة.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="من حساب" required>
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger><SelectValue placeholder="اختر الحساب المصدر" /></SelectTrigger>
              <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="إلى حساب" required>
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger><SelectValue placeholder="اختر الحساب الوجهة" /></SelectTrigger>
              <SelectContent>{options.filter((o) => o.value !== from).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="المبلغ" required>
              <Input type="number" inputMode="decimal" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label="رقم الإيصال">
              <Input dir="ltr" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="اختياري" />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit}><ArrowLeftRight className="h-4 w-4" />تنفيذ التحويل</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AccountDialog({
  open,
  onOpenChange,
  onSubmitVault,
  onSubmitBank,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmitVault: (input: { name: string; openingBalance: number; isActive: boolean; location?: string; minThreshold?: number; responsible?: string }) => void;
  onSubmitBank: (input: { bankName: string; accountNumber: string; accountHolder: string; openingBalance: number; isActive: boolean; branchName?: string; iban?: string }) => void;
}) {
  const [type, setType] = useState<AccountSourceType>('vault');
  const [name, setName] = useState('');
  const [opening, setOpening] = useState('');
  const [extra1, setExtra1] = useState('');
  const [extra2, setExtra2] = useState('');
  const [extra3, setExtra3] = useState('');

  function reset() { setName(''); setOpening(''); setExtra1(''); setExtra2(''); setExtra3(''); }

  function submit() {
    if (!name.trim()) return toast.error('أدخل اسم الحساب');
    if (type === 'vault') {
      onSubmitVault({ name: name.trim(), openingBalance: Number(opening) || 0, isActive: true, location: extra1.trim() || undefined, minThreshold: extra2 ? Number(extra2) : undefined, responsible: extra3.trim() || undefined });
    } else {
      if (!extra1.trim()) return toast.error('أدخل رقم الحساب');
      onSubmitBank({ bankName: name.trim(), accountNumber: extra1.trim(), accountHolder: extra2.trim() || name.trim(), openingBalance: Number(opening) || 0, isActive: true, branchName: extra3.trim() || undefined });
    }
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة خزنة أو حساب بنكي</DialogTitle>
          <DialogDescription>خزنة نقدية في المقر، أو حساب لدى مصرف.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="نوع الحساب" required>
            <Select value={type} onValueChange={(v) => setType(v as AccountSourceType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vault">خزنة نقدية</SelectItem>
                <SelectItem value="bank">حساب بنكي</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={type === 'vault' ? 'اسم الخزنة' : 'اسم البنك'} required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={type === 'vault' ? 'الخزنة الرئيسية' : 'مصرف الجمهورية'} />
          </Field>
          <Field label="الرصيد الافتتاحي">
            <Input type="number" inputMode="decimal" dir="ltr" value={opening} onChange={(e) => setOpening(e.target.value)} />
          </Field>
          {type === 'vault' ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="الموقع"><Input value={extra1} onChange={(e) => setExtra1(e.target.value)} placeholder="المكتب" /></Field>
              <Field label="الحد الأدنى"><Input type="number" dir="ltr" value={extra2} onChange={(e) => setExtra2(e.target.value)} /></Field>
            </div>
          ) : (
            <>
              <Field label="رقم الحساب" required><Input dir="ltr" value={extra1} onChange={(e) => setExtra1(e.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="صاحب الحساب"><Input value={extra2} onChange={(e) => setExtra2(e.target.value)} /></Field>
                <Field label="الفرع"><Input value={extra3} onChange={(e) => setExtra3(e.target.value)} /></Field>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button onClick={submit}><Plus className="h-4 w-4" />إضافة</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
