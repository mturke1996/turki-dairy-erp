// @ts-nocheck
/**
 * مساعدات النصوص العربية والأرقام والتواريخ لمستندات react-pdf.
 * النص يُكتب مباشرة (Unicode منطقي) ويعرضه الخط المضمّن بشكل صحيح دون تشكيل يدوي.
 */

export function ar(text: string | number | null | undefined): string {
  if (text == null) return '';
  return String(text);
}

export function arMoney(amount: number, currency = 'د.ل'): string {
  const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    amount || 0,
  );
  return `${formatted} ${currency}`;
}

export function ltrAmountCurrency(amount: number, currency = 'د.ل'): string {
  const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    amount || 0,
  );
  const curr = String(currency ?? '').trim();
  return `\u202A${formatted}\u00A0${curr}\u202C`;
}

export function arDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function arDateMedium(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat('ar-LY-u-ca-gregory', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return arDate(d);
  }
}

export function arDateParts(date: Date | string): {
  day: string;
  weekday: string;
  monthYear: string;
  gregorian: string;
} {
  const d = typeof date === 'string' ? new Date(date) : date;
  const safe = Number.isNaN(d.getTime()) ? new Date() : d;
  try {
    const day = new Intl.DateTimeFormat('ar-LY-u-ca-gregory-nu-latn', { day: 'numeric' }).format(safe);
    const weekday = new Intl.DateTimeFormat('ar-LY-u-ca-gregory', { weekday: 'long' }).format(safe);
    const monthYear = new Intl.DateTimeFormat('ar-LY-u-ca-gregory-nu-latn', {
      month: 'long',
      year: 'numeric',
    }).format(safe);
    return { day, weekday, monthYear, gregorian: arDate(safe) };
  } catch {
    return {
      day: String(safe.getDate()),
      weekday: '',
      monthYear: `${safe.getMonth() + 1}/${safe.getFullYear()}`,
      gregorian: arDate(safe),
    };
  }
}
