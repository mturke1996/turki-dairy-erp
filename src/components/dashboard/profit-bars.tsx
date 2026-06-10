'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SessionSummary } from '@/lib/domain/calculations';
import { Money } from '@/components/shared/money';
import { formatNumber } from '@/lib/utils';
import { CHART } from '@/lib/chart-colors';

function ProfitTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { label: string; revenue: number; profit: number; margin: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as { label: string; revenue: number; profit: number; margin: number };
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-[12px] shadow-lift">
      <p className="mb-1 font-semibold text-foreground">{p.label}</p>
      <div className="space-y-0.5 tabular" dir="ltr">
        <p className="flex items-center justify-between gap-4">
          <span className="text-navy-600">الإيراد</span>
          <Money value={p.revenue} decimals={0} />
        </p>
        <p className="flex items-center justify-between gap-4">
          <span className="text-meadow-600">الربح</span>
          <Money value={p.profit} decimals={0} />
        </p>
        <p className="flex items-center justify-between gap-4 border-t border-border pt-0.5">
          <span className="text-sun-600">الهامش</span>
          <span>{p.margin.toFixed(1)}%</span>
        </p>
      </div>
    </div>
  );
}

export function ProfitBars({ summaries }: { summaries: SessionSummary[] }) {
  const data = summaries
    .slice()
    .sort((a, b) => a.session.periodFrom.localeCompare(b.session.periodFrom))
    .map((s) => ({
      label: s.session.label,
      revenue: s.salesRevenue,
      profit: s.grossProfit,
      margin: s.marginPct,
    }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }} barGap={6}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: CHART.axis }}
          tickLine={false}
          axisLine={{ stroke: CHART.grid }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: CHART.axis }}
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(v) => formatNumber(v, 0)}
        />
        <Tooltip content={<ProfitTooltip />} cursor={{ fill: CHART.cursor }} />
        <Bar dataKey="revenue" name="الإيراد" fill={CHART.navy} radius={[4, 4, 0, 0]} maxBarSize={46} />
        <Bar dataKey="profit" name="الربح" radius={[4, 4, 0, 0]} maxBarSize={46}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART.meadow} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
