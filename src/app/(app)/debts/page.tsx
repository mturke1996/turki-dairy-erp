'use client';

import { useMemo, useState } from 'react';
import {
  Search,
  Tractor,
  Building2,
  Users,
  Scale,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/shared/money';
import { EmptyState } from '@/components/shared/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FarmerDetailDialog } from '@/components/farmers/farmer-detail-dialog';
import { CustomerDetailDialog } from '@/components/customers/customer-detail-dialog';
import { EmployeeDetailDialog } from '@/components/employees/employee-detail-dialog';
import { DebtFormDialog } from '@/components/debts/debt-form-dialog';
import { useDerived } from '@/lib/store/use-derived';
import { DEBT_PARTY_LABELS } from '@/lib/domain/constants';
import type { DebtPartyKind, DebtLedgerRow } from '@/lib/domain/calculations';
import { cn } from '@/lib/utils';

type FilterKind = 'all' | DebtPartyKind;

const KIND_ICON = { farmer: Tractor, customer: Building2, employee: Users } as const;
const KIND_VARIANT = { farmer: 'warning', customer: 'info', employee: 'neutral' } as const;

function BalanceOverview({
  payables,
  receivables,
  net,
}: {
  payables: number;
  receivables: number;
  net: number;
}) {
  const total = payables + receivables || 1;
  const recvPct = Math.round((receivables / total) * 100);

  return (
    <Card className="overflow-hidden border-meadow-200/60 bg-gradient-to-br from-card via-card to-meadow-50/30">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-meadow-700">ملخص الديون</p>
            <p className="mt-2 text-[13px] text-muted-foreground">مجمّع من الاستلام، المبيعات، المدفوعات، والديون المسجّلة</p>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <div>
                <p className="text-[11px] text-muted-foreground">صافي المركز</p>
                <Money
                  value={Math.abs(net)}
                  decimals={0}
                  className={cn('text-2xl font-bold', net >= 0 ? 'text-meadow-800' : 'text-rose-700')}
                />
                <p className="mt-0.5 text-[12px] font-medium text-muted-foreground">{net >= 0 ? 'لنا صافي' : 'علينا صافي'}</p>
              </div>
            </div>
          </div>
          <div className="w-full max-w-md space-y-2">
            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
              <div className="bg-meadow-500 transition-all" style={{ width: `${recvPct}%` }} />
              <div className="bg-rose-400 transition-all" style={{ width: `${100 - recvPct}%` }} />
            </div>
            <div className="flex justify-between text-[11.5px]">
              <span className="flex items-center gap-1 text-meadow-800">
                <ArrowDownLeft className="h-3.5 w-3.5" />
                لنا <Money value={receivables} decimals={0} className="inline font-semibold" />
              </span>
              <span className="flex items-center gap-1 text-rose-700">
                علينا <Money value={payables} decimals={0} className="inline font-semibold" />
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DebtSection({
  title,
  description,
  rows,
  emptyTitle,
  tone,
  onOpen,
}: {
  title: string;
  description: string;
  rows: DebtLedgerRow[];
  emptyTitle: string;
  tone: 'payable' | 'receivable';
  onOpen: (row: DebtLedgerRow) => void;
}) {
  const total = rows.reduce((s, r) => s + r.balance, 0);
  const Icon = tone === 'payable' ? ArrowUpRight : ArrowDownLeft;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-[15px]">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className={cn('rounded-lg px-3 py-2 text-left', tone === 'payable' ? 'bg-rose-50' : 'bg-meadow-50')}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">الإجمالي</p>
            <Money value={total} decimals={0} className={cn('text-[16px] font-bold', tone === 'payable' ? 'text-rose-800' : 'text-meadow-800')} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-muted-foreground">{emptyTitle}</p>
        ) : (
          <div className="space-y-2">
            {rows.slice(0, 8).map((row) => {
              const KindIcon = KIND_ICON[row.kind];
              return (
                <button
                  key={`${row.kind}-${row.id}`}
                  type="button"
                  onClick={() => onOpen(row)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-canvas-sunken/30 p-3 text-right transition-colors hover:bg-canvas-sunken/70 active:scale-[0.99]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-card ring-1 ring-border">
                    <KindIcon className="h-4.5 w-4.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{row.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{row.subtitle}</p>
                  </div>
                  <div className="shrink-0 text-left">
                    <Money value={row.balance} decimals={0} className="text-[13px] font-bold" />
                    <p className="mt-0.5 flex items-center justify-end gap-0.5 text-[10px] text-muted-foreground">
                      <Icon className="h-3 w-3" />
                      {DEBT_PARTY_LABELS[row.kind]}
                    </p>
                  </div>
                </button>
              );
            })}
            {rows.length > 8 ? (
              <p className="pt-1 text-center text-[11px] text-muted-foreground">+ {rows.length - 8} آخرين — استخدم البحث أدناه</p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DebtsPage() {
  const d = useDerived();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKind>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  const payables = useMemo(
    () => d.debts.rows.filter((r) => r.direction === 'payable').sort((a, b) => b.balance - a.balance),
    [d.debts.rows],
  );
  const receivables = useMemo(
    () => d.debts.rows.filter((r) => r.direction === 'receivable').sort((a, b) => b.balance - a.balance),
    [d.debts.rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return d.debts.rows.filter((r) => {
      if (filter !== 'all' && r.kind !== filter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.subtitle.toLowerCase().includes(q) ||
        (r.phone ?? '').includes(q)
      );
    });
  }, [d.debts.rows, filter, query]);

  const counts = useMemo(
    () => ({
      all: d.debts.rows.length,
      farmer: d.debts.rows.filter((r) => r.kind === 'farmer').length,
      customer: d.debts.rows.filter((r) => r.kind === 'customer').length,
      employee: d.debts.rows.filter((r) => r.kind === 'employee').length,
    }),
    [d.debts.rows],
  );

  function openRow(row: DebtLedgerRow) {
    if (row.kind === 'farmer') setFarmerId(row.id);
    else if (row.kind === 'customer') setCustomerId(row.id);
    else setEmployeeId(row.id);
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="المالية"
        title="الديون"
        description="مركز موحّد لكل الديون — فلاحون، عملاء، موظفون. سجّل ديناً جديداً أو اضغط أي طرف للتفاصيل والسداد."
        actions={
          <Button type="button" className="w-full sm:w-auto" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            تسجيل دين
          </Button>
        }
      />

      <BalanceOverview
        payables={d.debts.totalPayables}
        receivables={d.debts.totalReceivables}
        net={d.debts.netPosition}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <DebtSection
          title="ديون علينا"
          description={`${payables.length} طرف · فلاحون`}
          rows={payables}
          emptyTitle="لا ديون علينا حالياً"
          tone="payable"
          onOpen={openRow}
        />
        <DebtSection
          title="ديون لنا"
          description={`${receivables.length} طرف · عملاء + موظفون`}
          rows={receivables}
          emptyTitle="لا ديون لنا حالياً"
          tone="receivable"
          onOpen={openRow}
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <Scale className="h-4 w-4 text-muted-foreground" />
            السجل الكامل
          </CardTitle>
          <CardDescription>{filtered.length} من {d.debts.rows.length} — بحث وفلترة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث بالاسم، الكود، الهاتف…"
              className="h-11 pr-9 text-[14px] sm:h-10"
            />
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
            {(['all', 'farmer', 'customer', 'employee'] as FilterKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors',
                  filter === k
                    ? 'border-meadow-600 bg-meadow-50 text-meadow-800'
                    : 'border-border bg-card text-muted-foreground hover:bg-canvas-sunken/60',
                )}
              >
                {k === 'all' ? 'الكل' : DEBT_PARTY_LABELS[k]} ({counts[k]})
              </button>
            ))}
          </div>

          {filtered.length ? (
            <>
              <div className="space-y-2 md:hidden">
                {filtered.map((row) => {
                  const Icon = KIND_ICON[row.kind];
                  return (
                    <button
                      key={`${row.kind}-${row.id}`}
                      type="button"
                      onClick={() => openRow(row)}
                      className="w-full rounded-xl border border-border bg-card p-4 text-right active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-canvas-sunken">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{row.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {DEBT_PARTY_LABELS[row.kind]} · {row.direction === 'payable' ? 'علينا' : 'لنا'}
                          </p>
                        </div>
                        <Money value={row.balance} decimals={0} className="font-bold" />
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الطرف</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>الاتجاه</TableHead>
                      <TableHead className="text-left">المبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((row) => (
                      <TableRow key={`${row.kind}-${row.id}`} className="cursor-pointer" onClick={() => openRow(row)}>
                        <TableCell>
                          <p className="font-semibold">{row.name}</p>
                          <p className="text-[11px] text-muted-foreground">{row.subtitle} · <span dir="ltr">{row.code}</span></p>
                        </TableCell>
                        <TableCell><Badge variant={KIND_VARIANT[row.kind]}>{DEBT_PARTY_LABELS[row.kind]}</Badge></TableCell>
                        <TableCell className="text-[12px]">
                          {row.direction === 'payable' ? (
                            <span className="text-rose-700">علينا</span>
                          ) : (
                            <span className="text-meadow-700">لنا</span>
                          )}
                        </TableCell>
                        <TableCell className="text-left"><Money value={row.balance} decimals={0} className="font-semibold" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <EmptyState icon={Scale} title="لا نتائج" description="غيّر البحث أو سجّل ديناً جديداً." />
          )}
        </CardContent>
      </Card>

      <DebtFormDialog open={addOpen} onOpenChange={setAddOpen} />
      <FarmerDetailDialog farmerId={farmerId} open={!!farmerId} onOpenChange={(o) => !o && setFarmerId(null)} />
      <CustomerDetailDialog customerId={customerId} open={!!customerId} onOpenChange={(o) => !o && setCustomerId(null)} />
      <EmployeeDetailDialog employeeId={employeeId} open={!!employeeId} onOpenChange={(o) => !o && setEmployeeId(null)} />
    </div>
  );
}
