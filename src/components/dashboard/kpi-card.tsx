import Link from 'next/link';
import { ArrowUpLeft, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Accent = 'navy' | 'meadow' | 'sun' | 'rose';

const ACCENT: Record<Accent, { bar: string; icon: string; ring: string }> = {
  navy: { bar: 'stat-accent-navy', icon: 'text-navy-700', ring: 'ring-navy-100' },
  meadow: { bar: 'stat-accent-meadow', icon: 'text-meadow-700', ring: 'ring-meadow-100' },
  sun: { bar: 'stat-accent-sun', icon: 'text-sun-700', ring: 'ring-sun-100' },
  rose: { bar: 'stat-accent-rose', icon: 'text-rose-600', ring: 'ring-rose-100' },
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  accent = 'navy',
  hint,
  delta,
  href,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  accent?: Accent;
  hint?: React.ReactNode;
  delta?: { value: number; label?: string };
  href?: string;
}) {
  const a = ACCENT[accent];
  const positive = (delta?.value ?? 0) >= 0;

  const inner = (
    <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-5 shadow-whisper transition-all duration-200 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[12.5px] font-medium text-muted-foreground">{label}</p>
          <div className="text-[26px] font-bold leading-tight tracking-tight text-foreground">{value}</div>
        </div>
        <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl', a.bar)}>
          <Icon className={cn('h-5 w-5 stroke-[1.7]', a.icon)} />
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        {hint ? <p className="text-[11.5px] text-muted-foreground">{hint}</p> : <span />}
        {delta ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular',
              positive ? 'bg-pastel-green text-pastel-greenInk' : 'bg-pastel-red text-pastel-redInk',
            )}
            dir="ltr"
          >
            {positive ? '+' : ''}
            {delta.value.toFixed(1)}%
          </span>
        ) : null}
      </div>

      {href ? (
        <ArrowUpLeft className="absolute left-4 top-4 h-4 w-4 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}
