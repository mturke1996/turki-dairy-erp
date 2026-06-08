import { cn } from '@/lib/utils';
import { CURRENCY_LABEL } from '@/lib/utils';
import { formatLiters, formatMoney, formatWithUnit } from '@/lib/format-currency';

type UnitValueProps = {
  value: number;
  unit: string;
  decimals?: number;
  className?: string;
  muted?: boolean;
};

/** عرض رقم + وحدة — نص واحد معزول bidi (الرقم ثم الوحدة) */
export function UnitValue({ value, unit, decimals = 0, className, muted }: UnitValueProps) {
  return (
    <bdi className={cn('unit-value', muted && 'text-muted-foreground opacity-80', className)}>
      {formatWithUnit(value, unit, { decimals })}
    </bdi>
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
  return (
    <bdi className={cn('unit-value', muted && 'text-muted-foreground opacity-80', className)}>
      {formatMoney(value, { decimals, currency })}
    </bdi>
  );
}

export function moneyText(value: number, decimals = 0, currency = CURRENCY_LABEL): string {
  return formatMoney(value, { decimals, currency });
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
  if (!withUnit) {
    return (
      <bdi className={cn('unit-value', className)}>
        {formatWithUnit(value, '', { decimals })}
      </bdi>
    );
  }
  return (
    <bdi className={cn('unit-value', className)}>
      {formatLiters(value, decimals)}
    </bdi>
  );
}
