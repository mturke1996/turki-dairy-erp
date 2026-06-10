import { cn } from '@/lib/utils';

type LoadingIndicatorProps = {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** للاستخدام داخل أزرار — يخفي النص المرافق */
  compact?: boolean;
};

const dotSize = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-2.5 w-2.5',
} as const;

const gapSize = {
  sm: 'gap-1',
  md: 'gap-1.5',
  lg: 'gap-2',
} as const;

/** مؤشر انتظار خفيف — transform/opacity فقط (compositor-friendly) */
export function LoadingIndicator({
  label,
  size = 'md',
  className,
  compact = false,
}: LoadingIndicatorProps) {
  return (
    <div
      className={cn('flex flex-col items-center', gapSize[size], className)}
      role={label ? 'status' : undefined}
      aria-live={label ? 'polite' : undefined}
      aria-busy={label ? true : undefined}
      aria-label={label}
    >
      <div className={cn('flex items-center', gapSize[size])} aria-hidden={!!label}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              'rounded-full bg-current opacity-70 animate-splash-dot',
              dotSize[size],
            )}
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </div>
      {label && !compact ? (
        <p className="text-sm text-muted-foreground">{label}</p>
      ) : null}
    </div>
  );
}
