import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

const TONE = {
  navy: 'bg-navy-50 text-navy-700 ring-navy-100',
  meadow: 'bg-meadow-50 text-meadow-700 ring-meadow-100',
  sun: 'bg-sun-50 text-sun-800 ring-sun-100',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
  neutral: 'bg-canvas-sunken text-ink-mute ring-border',
} as const;

export function StatTile({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  tone?: keyof typeof TONE;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 shadow-whisper', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg ring-1', TONE[tone])}>
            <Icon className="h-4 w-4 stroke-[1.7]" />
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 text-[20px] font-bold tracking-tight text-foreground">{value}</div>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
