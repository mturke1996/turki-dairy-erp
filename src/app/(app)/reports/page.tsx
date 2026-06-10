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
import { ACCOUNT_LABELS } from '@/lib/domain/constants';
import { formatNumber, formatShortDate } from '@/lib/utils';
import type { TransactionKind } from '@/lib/domain/types';

const KIND_LABEL: Record<TransactionKind, string> = {
  supply: 'استلام حليب',
  sale: 'بيع',
  farmer_payment: 'دفعة فلاح',
  customer_payment: 'تحصيل عميل',
  employee_advance: 'سلفة موظف',
  adjustment: 'تسوية',
  expense: 'مصروف',
  payroll: 'رواتب',
  debt: 'دين / تسوية',
  external_income: 'مدخول خارجي',
};

export default function ReportsPage() {
  const data = useErpData();
  const d = useDerived();
  const canFinancial = usePermission('reports.financial');

  const pnl = d.incomeStatement;

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
      <div className="space-y-5 sm:space-y-6">
        <PageHeader eyebrow="النظام" title="التقارير" description="التحليلات المالية والمحاسبية." />
        <EmptyState icon={Scale} title="صلاحية غير كافية" description="هذه التقارير متاحة للمدير والمحاسب والمطّلع فقط." />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
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
        <StatTile label="مجمل الربح" value={<Money value={pnl.grossProfit} decimals={0} />} icon={Coins} tone="sun" hint={`هامش ${formatNumber(pnl.marginPct, 1)}%`} />
        <StatTile
          label="صافي الربح بعد المصاريف"
          value={<Money value={pnl.netProfit} decimals={0} />}
          icon={TrendingUp}
          tone={pnl.netProfit >= 0 ? 'meadow' : 'rose'}
          hint={pnl.wasteLosses > 0 ? `يشمل هدر ${formatNumber(pnl.wasteLosses, 0)}` : `هامش ${formatNumber(pnl.netMarginPct, 1)}%`}
        />
        <StatTile
          label="توازن القيود"
          value={d.trialBalance.balanced ? 'متوازن' : 'غير متوازن'}
          icon={Scale}
          tone={d.trialBalance.balanced ? 'meadow' : 'rose'}
          hint={`مدين = دائن = ${formatNumber(d.trialBalance.totalDebit, 0)}`}
        />
      </div>

      <Tabs defaultValue="trial">
        <div className="-mx-4 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
          <TabsList className="inline-flex h-auto w-max min-w-full gap-1 p-1 sm:w-full">
            <TabsTrigger value="trial" className="min-h-[40px] shrink-0 px-3 text-[12px] sm:text-[13px]">ميزان المراجعة</TabsTrigger>
            <TabsTrigger value="pnl" className="min-h-[40px] shrink-0 px-3 text-[12px] sm:text-[13px]">قائمة الدخل</TabsTrigger>
            <TabsTrigger value="aging" className="min-h-[40px] shrink-0 px-3 text-[12px] sm:text-[13px]">أعمار الديون</TabsTrigger>
            <TabsTrigger value="journal" className="min-h-[40px] shrink-0 px-3 text-[12px] sm:text-[13px]">دفتر اليومية</TabsTrigger>
          </TabsList>
        </div>

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
              <CardDescription>من الإيرادات إلى صافي الربح بعد خصم الهدر وكل المصاريف</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <PnlRow label="إيرادات المبيعات" value={pnl.revenue} />
              <PnlRow label="تكلفة البضاعة المباعة" value={-pnl.cogs} negative />
              <div className="my-2 flex items-center justify-between rounded-xl bg-meadow-50 px-4 py-3 ring-1 ring-meadow-100">
                <span className="text-[14px] font-bold text-meadow-800">مجمل الربح</span>
                <div className="text-left">
                  <Money value={pnl.grossProfit} className="text-[17px] font-bold text-meadow-800" />
                  <p className="text-[11px] text-meadow-700">هامش {formatNumber(pnl.marginPct, 1)}%</p>
                </div>
              </div>
              <PnlRow label="خسائر الهدر والتلف (غير نقدية)" value={-pnl.wasteLosses} negative />
              <PnlRow label="المصاريف التشغيلية" value={-pnl.operatingExpenses} negative />
              <PnlRow label="الرواتب والأجور" value={-pnl.salaries} negative />
              <div
                className={`mt-2 flex items-center justify-between rounded-xl px-4 py-3 ring-1 ${
                  pnl.netProfit >= 0 ? 'bg-meadow-50 ring-meadow-100' : 'bg-rose-50 ring-rose-100'
                }`}
              >
                <span className={`text-[14px] font-bold ${pnl.netProfit >= 0 ? 'text-meadow-800' : 'text-rose-700'}`}>
                  {pnl.netProfit >= 0 ? 'صافي الربح' : 'صافي الخسارة'}
                </span>
                <div className="text-left">
                  <Money value={pnl.netProfit} className={`text-[17px] font-bold ${pnl.netProfit >= 0 ? 'text-meadow-800' : 'text-rose-700'}`} />
                  <p className={`text-[11px] ${pnl.netProfit >= 0 ? 'text-meadow-700' : 'text-rose-600'}`}>هامش {formatNumber(pnl.netMarginPct, 1)}%</p>
                </div>
              </div>
              {pnl.wasteLosses > 0 && (
                <p className="mt-3 rounded-lg bg-sun-50 px-3 py-2 text-[11.5px] leading-relaxed text-sun-800 ring-1 ring-sun-100">
                  الهدر والتلف خسارة <strong>غير نقدية</strong>: لا يُخصم من الخزينة (ثمن الحليب يُسدَّد للفلاح ضمن الديون)،
                  بل يُخفّض قيمة المخزون وصافي الربح. لذلك يظهر هنا كخسارة تقلّل الربح دون تكرار خصم النقد.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* أعمار الديون */}
        <TabsContent value="aging">
          <Card>
            <CardHeader>
              <CardTitle>أعمار ديون العملاء</CardTitle>
              <CardDescription>توزيع الديون حسب التأخّر</CardDescription>
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
