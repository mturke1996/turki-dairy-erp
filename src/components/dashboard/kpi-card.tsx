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
  variant = 'grid',
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  accent?: Accent;
  hint?: React.ReactNode;
  delta?: { value: number; label?: string };
  href?: string;
  /** rail = بطاقة ضيقة للشريط الأفقي على الجوال */
  variant?: 'grid' | 'rail';
}) {
  const a = ACCENT[accent];
  const positive = (delta?.value ?? 0) >= 0;
  const isRail = variant === 'rail';

  const inner = (
    <div
      className={cn(
        'group relative flex h-full flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-whisper transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.98]',
        isRail ? 'min-h-[7.25rem] p-3' : 'p-3.5 hover:shadow-lift sm:p-5',
      )}
    >
      <div className={cn('flex items-start justify-between gap-2', !isRail && 'sm:gap-3')}>
        <div className="min-w-0 space-y-0.5">
          <p className={cn('truncate font-medium text-muted-foreground', isRail ? 'text-[10.5px]' : 'text-[11.5px] sm:text-[12.5px]')}>
            {label}
          </p>
          <div
            className={cn(
              'font-bold leading-tight tracking-tight text-foreground',
              isRail ? 'text-[17px]' : 'text-[19px] sm:text-[26px]',
            )}
          >
            {value}
          </div>
        </div>
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg ring-1',
            isRail ? 'h-7 w-7' : 'h-9 w-9 rounded-xl sm:h-11 sm:w-11',
            a.bar,
          )}
        >
          <Icon className={cn('stroke-[1.7]', isRail ? 'h-3.5 w-3.5' : 'h-4 w-4 sm:h-5 sm:w-5', a.icon)} />
        </span>
      </div>

      <div className={cn('flex items-center justify-between gap-1.5', isRail ? 'mt-2' : 'mt-2.5 sm:mt-3')}>
        {hint ? (
          <p className={cn('line-clamp-2 min-w-0 text-muted-foreground', isRail ? 'text-[10px] leading-snug' : 'line-clamp-1 text-[10.5px] sm:text-[11.5px]')}>
            {hint}
          </p>
        ) : (
          <span />
        )}
        {delta ? (
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular sm:px-2 sm:text-[11px]',
              positive ? 'bg-pastel-green text-pastel-greenInk' : 'bg-pastel-red text-pastel-redInk',
            )}
            dir="ltr"
          >
            {positive ? '+' : ''}
            {delta.value.toFixed(1)}%
          </span>
        ) : null}
      </div>

      {href && !isRail ? (
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
