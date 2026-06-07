import { cn } from '@/lib/utils';
import { CURRENCY_LABEL, formatNumber } from '@/lib/utils';

/** يعرض مبلغاً مالياً: الرقم ثم العملة، باتجاه LTR ثابت وأرقام جدولية. */
export function Money({
  value,
  decimals = 2,
  currency = CURRENCY_LABEL,
  className,
  muted,
}: {
  value: number;
  decimals?: number;
  currency?: string;
  className?: string;
  muted?: boolean;
}) {
  return (
    <span dir="ltr" className={cn('tabular inline-flex items-baseline gap-1', className)}>
      <span>{formatNumber(value, decimals)}</span>
      <span className={cn('text-[0.8em] font-medium', muted ? 'text-muted-foreground' : 'opacity-70')}>
        {currency}
      </span>
    </span>
  );
}

/** يعرض كمية باللتر بأرقام جدولية. */
export function Liters({
  value,
  decimals = 0,
  className,
  withUnit = true,
}: {
  value: number;
  decimals?: number;
  className?: string;
  withUnit?: boolean;
}) {
  return (
    <span dir="ltr" className={cn('tabular inline-flex items-baseline gap-1', className)}>
      <span>{formatNumber(value, decimals)}</span>
      {withUnit ? <span className="text-[0.8em] font-medium opacity-70">لتر</span> : null}
    </span>
  );
}
