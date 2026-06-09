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
    <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-3.5 shadow-whisper transition-all duration-200 hover:shadow-lift sm:p-5">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-[11.5px] font-medium text-muted-foreground sm:text-[12.5px]">{label}</p>
          <div className="text-[19px] font-bold leading-tight tracking-tight text-foreground sm:text-[26px]">{value}</div>
        </div>
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11', a.bar)}>
          <Icon className={cn('h-4 w-4 stroke-[1.7] sm:h-5 sm:w-5', a.icon)} />
        </span>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 sm:mt-3">
        {hint ? <p className="line-clamp-1 min-w-0 text-[10.5px] text-muted-foreground sm:text-[11.5px]">{hint}</p> : <span />}
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
