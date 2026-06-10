/**
 * محوّلات بين كائنات التطبيق (camelCase) وصفوف قاعدة البيانات (snake_case).
 *
 * - الحقول من نوع jsonb (archive, allowances, lines) تُمرَّر كما هي دون تحويل للمفاتيح الداخلية.
 * - الحقول الرقمية تُحوَّل إلى Number عند القراءة (PostgREST قد يعيد numeric كنص).
 * - القيم null تتحوّل إلى undefined لتطابق الأنواع الاختيارية في التطبيق.
 */

function toSnake(key: string): string {
  return key.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
}

function toCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** حقول jsonb تُنسخ كما هي (دون لمس مفاتيحها الداخلية). */
const OPAQUE = new Set(['archive', 'allowances', 'lines', 'carryForwardBalances', 'treasurySplits']);

/** حقول Postgres من نوع date — تُرسل بصيغة YYYY-MM-DD فقط. */
const DATE_ONLY = new Set([
  'onboardingDate',
  'periodFrom',
  'periodTo',
  'dueDate',
  'hireDate',
  'date',
]);

function normalizeForDb(key: string, v: unknown): unknown {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string' && v.trim() === '') return undefined;
  if (typeof v === 'number' && Number.isNaN(v)) return undefined;
  if (DATE_ONLY.has(key) && typeof v === 'string') {
    return v.slice(0, 10);
  }
  return v;
}

/** أسماء الحقول الرقمية (camelCase) لإجبار التحويل إلى Number عند القراءة. */
const NUMERIC = new Set([
  'openingStock', 'openingAvgCost', 'openingPayables', 'openingReceivables', 'cycleNumber',
  'livestockCount', 'avgDailyYield', 'defaultBuyPrice',
  'creditLimit', 'paymentTerms', 'defaultSellPrice',
  'quantity', 'unitPrice', 'total', 'fatPct',
  'amount', 'unitCost',
  'openingBalance', 'minThreshold',
  'budgetMonthly', 'baseSalary', 'totalAmount',
  'minStockThreshold',
  'syncVersion',
  'sampleQty',
  'settledAmount',
  'debtSettledAmount',
  'splitIndex',
  'splitCount',
  'splitTotalAmount',
]);
export function toRow<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const normalized = normalizeForDb(k, v);
    if (normalized === undefined) continue;
    out[OPAQUE.has(k) ? k : toSnake(k)] = normalized;
  }
  return out;
}

/** صف قاعدة بيانات → كائن تطبيق. */
export function fromRow<T = Record<string, unknown>>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const ck = OPAQUE.has(k) ? k : toCamel(k);
    if (v === null) {
      out[ck] = undefined;
    } else if (NUMERIC.has(ck)) {
      out[ck] = Number(v);
    } else {
      out[ck] = v;
    }
  }
  return out as T;
}

export function rowsFrom<T = Record<string, unknown>>(rows: Record<string, unknown>[] | null): T[] {
  return (rows ?? []).map((r) => fromRow<T>(r));
}
