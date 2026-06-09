'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Wallet,
  Landmark,
  ArrowLeftRight,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
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
import { useErpStore } from '@/lib/store/use-erp-store';
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

export default function TreasuryPage() {
  return (
    <AccessGate permission="vaults.manage">
      <TreasuryContent />
    </AccessGate>
  );
}

function TreasuryContent() {
  const vaults = useErpStore((s) => s.vaults);
  const banks = useErpStore((s) => s.banks);
  const movements = useErpStore((s) => s.cashMovements);
  const recordTransfer = useErpStore((s) => s.recordTransfer);
  const addVault = useErpStore((s) => s.addVault);
  const addBank = useErpStore((s) => s.addBank);
  const setAccountOpeningBalance = useErpStore((s) => s.setAccountOpeningBalance);

  const snap = useMemo(() => computeTreasury(vaults, banks, movements), [vaults, banks, movements]);

  const [filter, setFilter] = useState<string>('all');
  const filteredMovements = useMemo(() => {
    const sorted = [...movements].sort((a, b) => +new Date(b.date) - +new Date(a.date));
    if (filter === 'all') return sorted.slice(0, 20);
    return sorted.filter((m) => m.sourceId === filter).slice(0, 20);
  }, [movements, filter]);

  const [transferOpen, setTransferOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [openingOpen, setOpeningOpen] = useState(false);

  const belowMin = snap.vaults.filter((v) => v.belowMin);

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
      accountTypeLabel: acc?.type === 'vault' ? 'خزنة' : 'بنك',
      opening: acc?.opening ?? 0,
      totalIn: acc?.inflow ?? 0,
      totalOut: acc?.outflow ?? 0,
      closing: acc?.balance ?? 0,
      rows,
    };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="المالية"
        title="الخزن والبنوك"
        description="مركز إدارة السيولة — كل حركة مالية موثّقة بمصدرها أو وجهتها."
        actions={
          <>
            <Button type="button" variant="outline" asChild>
              <Link href="/income">
                <TrendingUp className="h-4 w-4" />
                مدخول خارج الخدمة
              </Link>
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpeningOpen(true)}>
              <Settings2 className="h-4 w-4" />
              ضبط أرصدة البداية
            </Button>
            <Button type="button" variant="outline" onClick={() => setAccountOpen(true)}>
              <Plus className="h-4 w-4" />
              حساب جديد
            </Button>
            <Button type="button" onClick={() => setTransferOpen(true)} disabled={snap.accounts.length < 2}>
              <ArrowLeftRight className="h-4 w-4" />
              تحويل بين الحسابات
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="إجمالي الكاش" value={<Money value={snap.totalVaults} decimals={0} />} icon={Wallet} tone="meadow" hint={`${snap.vaults.length} خزنة`} />
        <StatTile label="إجمالي البنوك" value={<Money value={snap.totalBanks} decimals={0} />} icon={Landmark} tone="navy" hint={`${snap.banks.length} حساب`} />
        <StatTile label="المركز النقدي الكلي" value={<Money value={snap.total} decimals={0} />} icon={Coins} tone="sun" hint="خزن + بنوك" />
        <StatTile label="تنبيهات الرصيد" value={belowMin.length} icon={AlertTriangle} tone={belowMin.length ? 'rose' : 'neutral'} hint="خزن تحت الحد الأدنى" />
      </div>

      {/* بطاقات الحسابات */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {snap.accounts.map((acc) => (
          <Card key={acc.id} className={cn(acc.belowMin && 'border-rose-200/70')}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg ring-1',
                      acc.type === 'vault' ? 'bg-meadow-50 text-meadow-700 ring-meadow-100' : 'bg-navy-50 text-navy-700 ring-navy-100',
                    )}
                  >
                    {acc.type === 'vault' ? <Wallet className="h-4.5 w-4.5" /> : <Landmark className="h-4.5 w-4.5" />}
                  </span>
                  <div>
                    <CardTitle className="text-[14px]">{acc.name}</CardTitle>
                    <p className="text-[11px] text-muted-foreground" dir="ltr">{acc.code}</p>
                  </div>
                </div>
                {acc.belowMin ? <Badge variant="danger">تحت الحد</Badge> : <Badge variant="neutral">{acc.type === 'vault' ? 'خزنة' : 'بنك'}</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-[11px] text-muted-foreground">الرصيد الحالي</p>
                <p className="text-[22px] font-bold tracking-tight text-foreground">
                  <Money value={acc.balance} decimals={0} />
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div className="rounded-lg bg-meadow-50/60 px-2.5 py-1.5">
                  <span className="flex items-center gap-1 text-meadow-700"><ArrowDownLeft className="h-3 w-3" /> وارد</span>
                  <Money value={acc.inflow} decimals={0} className="font-semibold" muted />
                </div>
                <div className="rounded-lg bg-rose-50/50 px-2.5 py-1.5">
                  <span className="flex items-center gap-1 text-rose-600"><ArrowUpRight className="h-3 w-3" /> صادر</span>
                  <Money value={acc.outflow} decimals={0} className="font-semibold" muted />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                الرصيد الافتتاحي: <Money value={acc.opening} decimals={0} className="text-foreground" />
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* الحركات النقدية */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>الحركات النقدية</CardTitle>
            <CardDescription>أحدث الحركات على الخزن والبنوك</CardDescription>
          </div>
          <div className="flex items-center gap-2">
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
              <SelectTrigger className="w-44">
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
        <CardContent>
          {filteredMovements.length === 0 ? (
            <EmptyState icon={Coins} title="لا توجد حركات" description="ستظهر الحركات هنا فور تسجيلها." />
          ) : (
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
                    <TableCell className="max-w-[220px] truncate text-[12.5px] text-muted-foreground">{m.description}</TableCell>
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
          )}
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
          <DialogTitle>تحويل بين الحسابات</DialogTitle>
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
  const [extra1, setExtra1] = useState(''); // location / accountNumber
  const [extra2, setExtra2] = useState(''); // minThreshold / accountHolder
  const [extra3, setExtra3] = useState(''); // responsible / branchName

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
          <DialogTitle>إضافة حساب جديد</DialogTitle>
          <DialogDescription>خزنة نقدية فيزيائية أو حساب بنكي.</DialogDescription>
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
