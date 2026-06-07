'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Wallet, Landmark, Receipt, Users, CalendarClock, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Money, Liters } from '@/components/shared/money';
import { useErpStore } from '@/lib/store/use-erp-store';
import { useCycle } from '@/lib/store/use-cycle';
import { computeTreasury, computeExpenseTotals } from '@/lib/domain/treasury';
import { cn } from '@/lib/utils';

export function DashboardV3Panels() {
  const vaults = useErpStore((s) => s.vaults);
  const banks = useErpStore((s) => s.banks);
  const movements = useErpStore((s) => s.cashMovements);
  const expenses = useErpStore((s) => s.expenses);
  const categories = useErpStore((s) => s.expenseCategories);
  const employees = useErpStore((s) => s.employees);
  const batches = useErpStore((s) => s.payrollBatches);

  const treasury = useMemo(() => computeTreasury(vaults, banks, movements), [vaults, banks, movements]);
  const expenseTotals = useMemo(() => computeExpenseTotals(expenses, categories), [expenses, categories]);
  const cycle = useCycle();

  const activeEmployees = employees.filter((e) => e.status === 'active');
  const monthlyLabor = activeEmployees.reduce(
    (s, e) => s + e.baseSalary + e.allowances.housing + e.allowances.transport + e.allowances.food,
    0,
  );
  const lastPaid = batches
    .filter((b) => b.status === 'paid')
    .sort((a, b) => +new Date(b.paidAt ?? 0) - +new Date(a.paidAt ?? 0))[0];
  const draftBatches = batches.filter((b) => b.status !== 'paid').length;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
      {/* الخزن والبنوك */}
      <PanelCard href="/treasury" icon={Wallet} title="الخزن والبنوك" subtitle="المركز النقدي اللحظي">
        <div className="mb-3">
          <p className="text-[11px] text-muted-foreground">المجموع الكلي</p>
          <p className="text-[22px] font-bold tracking-tight text-foreground">
            <Money value={treasury.total} decimals={0} />
          </p>
        </div>
        <div className="space-y-1.5">
          {treasury.accounts.slice(0, 3).map((a) => (
            <div key={a.id} className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                {a.type === 'vault' ? <Wallet className="h-3.5 w-3.5" /> : <Landmark className="h-3.5 w-3.5" />}
                <span className="max-w-[110px] truncate">{a.name}</span>
              </span>
              <Money value={a.balance} decimals={0} className={cn('font-semibold', a.belowMin && 'text-rose-600')} />
            </div>
          ))}
        </div>
      </PanelCard>

      {/* المصاريف */}
      <PanelCard href="/expenses" icon={Receipt} title="المصاريف" subtitle="إجمالي المصروفات">
        <div className="mb-3">
          <p className="text-[11px] text-muted-foreground">الإجمالي</p>
          <p className="text-[22px] font-bold tracking-tight text-rose-600">
            <Money value={expenseTotals.total} decimals={0} />
          </p>
        </div>
        <div className="space-y-1.5">
          {expenseTotals.byCategory.slice(0, 3).map((c) => (
            <div key={c.categoryId} className="flex items-center justify-between text-[12px]">
              <span className="max-w-[120px] truncate text-muted-foreground">{c.name}</span>
              <Money value={c.amount} decimals={0} className="font-semibold" />
            </div>
          ))}
          {expenseTotals.byCategory.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">لا مصاريف مسجّلة</p>
          ) : null}
        </div>
      </PanelCard>

      {/* الرواتب */}
      <PanelCard href="/hr" icon={Users} title="الموظفون والرواتب" subtitle="الكوادر والكلفة">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">موظفون نشطون</p>
            <p className="text-[22px] font-bold tracking-tight text-foreground">{activeEmployees.length}</p>
          </div>
          {draftBatches > 0 ? <Badge variant="warning">{draftBatches} كشف معلّق</Badge> : null}
        </div>
        <div className="space-y-1.5 text-[12px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">الكلفة الشهرية</span>
            <Money value={monthlyLabor} decimals={0} className="font-semibold" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">آخر صرف</span>
            {lastPaid ? <Money value={lastPaid.totalAmount} decimals={0} className="font-semibold" /> : <span className="text-muted-foreground">—</span>}
          </div>
        </div>
      </PanelCard>

      {/* الدورة الحالية */}
      <PanelCard href="/sessions" icon={CalendarClock} title="الدورة الحالية" subtitle={cycle.window.label}>
        <div className="mb-2 flex items-center justify-between text-[12px]">
          <span className="text-muted-foreground">التقدّم</span>
          <span className="font-semibold text-foreground">
            اليوم {cycle.progress.daysElapsed} من {cycle.progress.daysTotal}
          </span>
        </div>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-canvas-sunken">
          <div className="h-full rounded-full bg-meadow-500" style={{ width: `${cycle.progress.pct}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div>
            <p className="text-muted-foreground">مورّد</p>
            <Liters value={cycle.stats.supplied} className="font-semibold" />
          </div>
          <div>
            <p className="text-muted-foreground">مباع</p>
            <Liters value={cycle.stats.sold} className="font-semibold" />
          </div>
          <div className="col-span-2 mt-0.5 border-t border-border pt-1.5">
            <p className="text-muted-foreground">مستحقات الفلاحين عند الإغلاق</p>
            <Money value={cycle.stats.payoutsDue} decimals={0} className="font-semibold text-foreground" />
          </div>
        </div>
      </PanelCard>
    </div>
  );
}

function PanelCard({
  href,
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  href: string;
  icon: typeof Wallet;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="transition-shadow hover:shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-canvas-sunken text-navy-700 ring-1 ring-border">
              <Icon className="h-4.5 w-4.5 stroke-[1.7]" />
            </span>
            <div>
              <CardTitle className="text-[13.5px]">{title}</CardTitle>
              <CardDescription className="text-[11px]">{subtitle}</CardDescription>
            </div>
          </div>
          <Link href={href} className="text-muted-foreground transition-colors hover:text-foreground">
            <ChevronLeft className="h-4.5 w-4.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
