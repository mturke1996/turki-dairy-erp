import { CURRENCY_LABEL, formatNumber } from '@/lib/utils';

export type FormatUnitOptions = {
  decimals?: number;
  /** يعزل اتجاه الرقم عن RTL الصفحة — افتراضي true */
  isolate?: boolean;
};

const LRI = '\u2066'; // Left-to-Right Isolate
const PDI = '\u2069'; // Pop Directional Isolate
const NBSP = '\u00A0';

/**
 * تنسيق قيمة + وحدة بالعربية: الرقم ثم الوحدة (مثال: 1,250 د.ل · 500 لتر).
 * حل موحّد لكل العملة واللتر وأي وحدة — نص واحد مع عزل bidi.
 */
export function formatWithUnit(
  value: number | string,
  unit: string,
  { decimals = 0, isolate = true }: FormatUnitOptions = {},
): string {
  const num = typeof value === 'string' ? Number(value) : value;
  const safe = Number.isFinite(num) ? num : 0;
  const formatted = formatNumber(safe, decimals);
  const unitPart = String(unit ?? '').trim();
  if (!unitPart) return isolate ? `${LRI}${formatted}${PDI}` : formatted;
  if (!isolate) return `${formatted}${NBSP}${unitPart}`;
  return `${LRI}${formatted}${PDI}${NBSP}${unitPart}`;
}

export type FormatMoneyOptions = FormatUnitOptions & {
  currency?: string;
};

/** مبلغ: الرقم ثم العملة */
export function formatMoney(
  value: number | string,
  { decimals = 2, currency = CURRENCY_LABEL, isolate = true }: FormatMoneyOptions = {},
): string {
  return formatWithUnit(value, currency, { decimals, isolate });
}

/** لتر: الرقم ثم «لتر» */
export function formatLiters(value: number | string, decimals = 0, isolate = true): string {
  return formatWithUnit(value, 'لتر', { decimals, isolate });
}

/** سعر لكل لتر: 1.250 د.ل/لتر */
export function formatPricePerLiter(value: number | string, decimals = 3): string {
  return formatWithUnit(value, `${CURRENCY_LABEL}/لتر`, { decimals });
}
