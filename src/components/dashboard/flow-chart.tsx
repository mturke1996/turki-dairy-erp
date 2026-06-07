'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailyFlowPoint } from '@/lib/domain/calculations';
import { formatNumber } from '@/lib/utils';

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function FlowTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const get = (key: string) => payload.find((p: any) => p.dataKey === key)?.value ?? 0;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-[12px] shadow-lift">
      <p className="mb-1 font-semibold text-foreground">{shortDate(label)}</p>
      <div className="space-y-0.5 tabular" dir="ltr">
        <p className="flex items-center justify-between gap-4">
          <span className="text-meadow-600">وارد</span>
          <span>{formatNumber(get('inQty'))} لتر</span>
        </p>
        <p className="flex items-center justify-between gap-4">
          <span className="text-navy-600">صادر</span>
          <span>{formatNumber(get('outQty'))} لتر</span>
        </p>
        <p className="flex items-center justify-between gap-4 border-t border-border pt-0.5">
          <span className="text-sun-600">الرصيد</span>
          <span>{formatNumber(get('balance'))} لتر</span>
        </p>
      </div>
    </div>
  );
}

export function FlowChart({ data }: { data: DailyFlowPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(42 18% 89%)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tick={{ fontSize: 11, fill: 'hsl(115 5% 44%)' }}
          tickLine={false}
          axisLine={{ stroke: 'hsl(42 18% 89%)' }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'hsl(115 5% 44%)' }}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(v) => formatNumber(v, 0)}
        />
        <Tooltip content={<FlowTooltip />} cursor={{ fill: 'hsl(40 11% 95%)' }} />
        <Bar dataKey="inQty" name="وارد" fill="#D94841" radius={[3, 3, 0, 0]} maxBarSize={22} />
        <Bar dataKey="outQty" name="صادر" fill="#171717" radius={[3, 3, 0, 0]} maxBarSize={22} />
        <Line
          dataKey="balance"
          name="الرصيد"
          type="monotone"
          stroke="#A89253"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
