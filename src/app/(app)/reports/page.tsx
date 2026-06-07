'use client';

import { useMemo } from 'react';
import { Scale, TrendingUp, Wallet, Coins } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatTile } from '@/components/shared/stat-tile';
import { Money } from '@/components/shared/money';
import { EmptyState } from '@/components/shared/empty-state';
import { TurkiPdfToolbar } from '@/features/pdf/pdf-toolbar';
import { FinancialReportPDF } from '@/features/pdf/FinancialReportPDF';
import { useErpData, useDerived } from '@/lib/store/use-derived';
import { usePermission } from '@/lib/store/use-permission';
import { computeAging } from '@/lib/domain/calculations';
import { computePnL } from '@/lib/domain/accounting';
import { ACCOUNT_LABELS } from '@/lib/domain/constants';
import { formatNumber, formatShortDate } from '@/lib/utils';
import type { TransactionKind } from '@/lib/domain/types';

const KIND_LABEL: Record<TransactionKind, string> = {
  supply: 'توريد',
  sale: 'بيع',
  farmer_payment: 'دفعة فلاح',
  customer_payment: 'تحصيل عميل',
  adjustment: 'تسوية',
  expense: 'مصروف',
  payroll: 'رواتب',
};

export default function ReportsPage() {
  const data = useErpData();
  const d = useDerived();
  const canFinancial = usePermission('reports.financial');

  const pnl = useMemo(() => {
    const revenue = d.sessionSummaries.reduce((s, x) => s + x.salesRevenue, 0);
    const cogs = d.sessionSummaries.reduce((s, x) => s + x.cogs, 0);
    return computePnL(revenue, cogs);
  }, [d.sessionSummaries]);

  const aging = useMemo(() => {
    const total = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
    for (const c of d.customers) {
      const cs = data.sales.filter((s) => s.customerId === c.id);
      const a = computeAging(cs, c.receivedTotal);
      total.current += a.current;
      total.d1_30 += a.d1_30;
      total.d31_60 += a.d31_60;
      total.d61_90 += a.d61_90;
      total.d90_plus += a.d90_plus;
    }
    return total;
  }, [d.customers, data.sales]);

  const recentJournals = useMemo(() => [...d.journals].reverse().slice(0, 30), [d.journals]);

  if (!canFinancial) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="النظام" title="التقارير" description="التحليلات المالية والمحاسبية." />
        <EmptyState icon={Scale} title="صلاحية غير كافية" description="هذه التقارير متاحة للمدير والمحاسب والمطّلع فقط." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="النظام"
        title="التقارير المالية"
        description="ميزان المراجعة، قائمة الدخل، أعمار الديون، ودفتر اليومية — مع تصدير PDF رسمي."
        actions={
          <TurkiPdfToolbar
            fileName="القوائم-المالية"
            label="القوائم المالية PDF"
            render={async () => (
              <FinancialReportPDF trialBalance={d.trialBalance} pnl={pnl} aging={aging} asOfLabel={d.activeSession?.label} />
            )}
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="الإيرادات" value={<Money value={pnl.revenue} decimals={0} />} icon={Wallet} tone="navy" />
        <StatTile label="تكلفة المبيعات" value={<Money value={pnl.cogs} decimals={0} />} icon={Coins} tone="sun" />
        <StatTile label="الربح الإجمالي" value={<Money value={pnl.grossProfit} decimals={0} />} icon={TrendingUp} tone="meadow" hint={`هامش ${formatNumber(pnl.marginPct, 1)}%`} />
        <StatTile
          label="توازن القيود"
          value={d.trialBalance.balanced ? 'متوازن' : 'غير متوازن'}
          icon={Scale}
          tone={d.trialBalance.balanced ? 'meadow' : 'rose'}
          hint={`مدين = دائن = ${formatNumber(d.trialBalance.totalDebit, 0)}`}
        />
      </div>

      <Tabs defaultValue="trial">
        <TabsList>
          <TabsTrigger value="trial">ميزان المراجعة</TabsTrigger>
          <TabsTrigger value="pnl">قائمة الدخل</TabsTrigger>
          <TabsTrigger value="aging">أعمار الديون</TabsTrigger>
          <TabsTrigger value="journal">دفتر اليومية</TabsTrigger>
        </TabsList>

        {/* ميزان المراجعة */}
        <TabsContent value="trial">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>ميزان المراجعة</CardTitle>
                <CardDescription>أرصدة الحسابات من القيود المزدوجة</CardDescription>
              </div>
              <Badge variant={d.trialBalance.balanced ? 'success' : 'danger'}>
                {d.trialBalance.balanced ? 'متوازن' : 'غير متوازن'}
              </Badge>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الحساب</TableHead>
                    <TableHead className="text-left">مدين</TableHead>
                    <TableHead className="text-left">دائن</TableHead>
                    <TableHead className="text-left">الرصيد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.trialBalance.rows.map((r) => (
                    <TableRow key={r.account}>
                      <TableCell className="text-[13px] font-medium">{ACCOUNT_LABELS[r.account]}</TableCell>
                      <TableCell className="text-left"><Money value={r.debit} decimals={0} className="text-[12.5px]" muted /></TableCell>
                      <TableCell className="text-left"><Money value={r.credit} decimals={0} className="text-[12.5px]" muted /></TableCell>
                      <TableCell className="text-left"><Money value={Math.abs(r.balance)} decimals={0} className="text-[13px] font-semibold" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-canvas-sunken px-4 py-3 text-[13px] font-semibold">
                <span>الإجماليات</span>
                <div className="flex gap-6">
                  <Money value={d.trialBalance.totalDebit} decimals={0} />
                  <Money value={d.trialBalance.totalCredit} decimals={0} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* قائمة الدخل */}
        <TabsContent value="pnl">
          <Card>
            <CardHeader>
              <CardTitle>قائمة الدخل</CardTitle>
              <CardDescription>الإيرادات مقابل تكلفة البضاعة المباعة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <PnlRow label="إيرادات المبيعات" value={pnl.revenue} />
              <PnlRow label="تكلفة البضاعة المباعة" value={-pnl.cogs} negative />
              <div className="mt-2 flex items-center justify-between rounded-xl bg-meadow-50 px-4 py-3 ring-1 ring-meadow-100">
                <span className="text-[14px] font-bold text-meadow-800">مجمل الربح</span>
                <div className="text-left">
                  <Money value={pnl.grossProfit} className="text-[17px] font-bold text-meadow-800" />
                  <p className="text-[11px] text-meadow-700">هامش {formatNumber(pnl.marginPct, 1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* أعمار الديون */}
        <TabsContent value="aging">
          <Card>
            <CardHeader>
              <CardTitle>أعمار ذمم العملاء</CardTitle>
              <CardDescription>توزيع المبالغ المستحقة حسب التأخّر</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  { l: 'غير مستحق', v: aging.current, tone: 'meadow' as const },
                  { l: '1-30 يوم', v: aging.d1_30, tone: 'navy' as const },
                  { l: '31-60 يوم', v: aging.d31_60, tone: 'sun' as const },
                  { l: '61-90 يوم', v: aging.d61_90, tone: 'sun' as const },
                  { l: '+90 يوم', v: aging.d90_plus, tone: 'rose' as const },
                ].map((b) => (
                  <StatTile key={b.l} label={b.l} value={<Money value={b.v} decimals={0} />} tone={b.tone} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* دفتر اليومية */}
        <TabsContent value="journal">
          <Card>
            <CardHeader>
              <CardTitle>دفتر اليومية</CardTitle>
              <CardDescription>أحدث القيود المحاسبية</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>المرجع</TableHead>
                    <TableHead className="text-center">النوع</TableHead>
                    <TableHead>البيان</TableHead>
                    <TableHead className="text-left">المبلغ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentJournals.map((j) => {
                    const amount = j.lines.reduce((s, l) => s + l.debit, 0);
                    return (
                      <TableRow key={j.id}>
                        <TableCell className="text-[12.5px]">{formatShortDate(j.date)}</TableCell>
                        <TableCell className="font-mono text-[11.5px] text-muted-foreground" dir="ltr">{j.ref}</TableCell>
                        <TableCell className="text-center"><Badge variant="neutral">{KIND_LABEL[j.kind]}</Badge></TableCell>
                        <TableCell className="text-[12.5px] text-muted-foreground">{j.description}</TableCell>
                        <TableCell className="text-left"><Money value={amount} decimals={0} className="text-[12.5px] font-semibold" /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PnlRow({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2.5 text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <Money value={value} className={negative ? 'font-semibold text-rose-600' : 'font-semibold'} />
    </div>
  );
}
