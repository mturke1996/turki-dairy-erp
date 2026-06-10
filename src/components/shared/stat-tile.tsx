import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { METRIC_TONES, type MetricTone } from './metric-tokens';

export function StatTile({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
  hint,
  hero = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  tone?: MetricTone;
  hint?: React.ReactNode;
  /** أرقام كبيرة بخط serif تحريري */
  hero?: boolean;
  className?: string;
}) {
  const t = METRIC_TONES[tone];
  return (
    <div dir="rtl" className={cn('rounded-xl border border-border bg-card p-3 shadow-whisper sm:p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-right text-[12px] font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg ring-1', t.icon)}>
            <Icon className="h-4 w-4 stroke-[1.7]" />
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          'mt-1.5 text-[20px] font-bold tracking-tight text-foreground',
          hero && 'metric-hero text-[22px]',
        )}
      >
        {value}
      </div>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
