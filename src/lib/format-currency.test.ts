import { describe, expect, it } from 'vitest';
import { formatLiters, formatMoney, formatWithUnit } from './format-currency';

describe('formatWithUnit', () => {
  it('يعرض الرقم ثم الوحدة', () => {
    expect(formatWithUnit(1250, 'د.ل', { decimals: 0, isolate: false })).toBe('1,250\u00A0د.ل');
    expect(formatWithUnit(500, 'لتر', { decimals: 0, isolate: false })).toBe('500\u00A0لتر');
  });

  it('formatMoney — رقم ثم عملة', () => {
    expect(formatMoney(99.5, { decimals: 2, isolate: false })).toBe('99.50\u00A0د.ل');
  });

  it('formatLiters — رقم ثم لتر', () => {
    expect(formatLiters(1200, 0, false)).toBe('1,200\u00A0لتر');
  });

  it('يعزل الرقم فقط — الوحدة خارجه في RTL', () => {
    const s = formatMoney(100, { decimals: 0 });
    expect(s.startsWith('\u2066')).toBe(true);
    expect(s).toContain('\u2069\u00A0د.ل');
    expect(s.indexOf('100')).toBeLessThan(s.indexOf('د.ل'));
  });
});
