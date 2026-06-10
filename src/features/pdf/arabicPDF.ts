// @ts-nocheck
/**
 * مساعدات النص العربي لمستندات react-pdf + Tajawal.
 *
 * لا نستخدم Arabic Presentation Forms (U+FE70+) — Tajawal يفتقد بعضها
 * (مثل U+FE8F) فيتعطل textkit في المتصفح: Cannot read properties of undefined (reading 'id').
 *
 * نعتمد الحروف العربية المنطقية (U+0600) مع direction:'rtl' على الحاويات.
 */

const HAS_ARABIC = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/** نص عربي — Unicode منطقي كما كُتب (لا تشكيل يدوي ولا عكس). */
export function ar(text: string | number | null | undefined): string {
  if (text == null) return '';
  return String(text);
}

/**
 * مبلغ + عملة — نص واحد باتجاه LTR (بدون أحرف bidi U+202A).
 * يُفضّل PdfMoneyText؛ هذا للحقول النصية فقط.
 */
export function ltrAmountCurrency(amount: number, currency = 'د.ل', decimals = 2): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(amount) ? amount : 0);
  const curr = String(currency ?? '').trim();
  return `${curr}\u00A0${formatted}`;
}

export function arMoney(amount: number, currency = 'د.ل', decimals = 2): string {
  return ltrAmountCurrency(amount, currency, decimals);
}

/** قيمة إحصائية — أرقام/مبالغ كما هي؛ عربي فقط يمرّ عبر ar */
export function pdfDisplayValue(text: string | number | null | undefined): string {
  if (text == null) return '';
  const str = String(text);
  if (!str) return '';
  if (!HAS_ARABIC.test(str)) return str;
  if (/[0-9]/.test(str)) return str;
  return ar(str);
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
