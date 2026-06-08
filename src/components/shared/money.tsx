import { cn, formatNumber, CURRENCY_LABEL } from '@/lib/utils';

type UnitValueProps = {
  value: number;
  unit: string;
  decimals?: number;
  className?: string;
  muted?: boolean;
};

/**
 * عرض رقم + وحدة للعربية (RTL):
 * الرقم على اليمين (يُقرأ أولاً) ← الوحدة على اليسار (تُقرأ ثانياً).
 */
export function UnitValue({ value, unit, decimals = 0, className, muted }: UnitValueProps) {
  const formatted = formatNumber(value, decimals);

  if (!unit) {
    return (
      <bdi dir="ltr" className={cn('tabular whitespace-nowrap', className, muted && 'text-muted-foreground opacity-80')}>
        {formatted}
      </bdi>
    );
  }

  return (
    <span
      dir="rtl"
      className={cn(
        'unit-value inline-flex items-baseline gap-1 whitespace-nowrap',
        muted && 'text-muted-foreground opacity-80',
        className,
      )}
    >
      <bdi dir="ltr" className="tabular">{formatted}</bdi>
      <span>{unit}</span>
    </span>
  );
}

/** مبلغ: الرقم ثم العملة */
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
  return <UnitValue value={value} unit={currency} decimals={decimals} className={className} muted={muted} />;
}

export function moneyText(value: number, decimals = 0, currency = CURRENCY_LABEL): string {
  const formatted = formatNumber(value, decimals);
  return `\u2066${formatted}\u2069\u00A0${currency}`;
}

/** لتر: الرقم ثم «لتر» */
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
    <UnitValue
      value={value}
      unit={withUnit ? 'لتر' : ''}
      decimals={decimals}
      className={className}
    />
  );
}
