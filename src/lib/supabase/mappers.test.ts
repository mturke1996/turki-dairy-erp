import { describe, expect, it } from 'vitest';
import { fromRow, toRow, rowsFrom } from '@/lib/supabase/mappers';

describe('mappers', () => {
  it('toRow converts camelCase to snake_case', () => {
    expect(toRow({ fullName: 'Ali', defaultBuyPrice: 1.85 })).toEqual({
      full_name: 'Ali',
      default_buy_price: 1.85,
    });
  });

  it('fromRow converts snake_case and numeric fields', () => {
    const row = fromRow<{ fullName: string; defaultBuyPrice: number }>({
      full_name: 'Ali',
      default_buy_price: '1.85',
    });
    expect(row.fullName).toBe('Ali');
    expect(row.defaultBuyPrice).toBe(1.85);
  });

  it('rowsFrom handles null', () => {
    expect(rowsFrom(null)).toEqual([]);
  });

  it('preserves opaque jsonb keys', () => {
    const archive = { summary: { supply: { qty: 100 } } };
    expect(toRow({ archive })).toEqual({ archive });
    expect(fromRow({ archive })).toEqual({ archive });
  });

  it('maps carryForwardBalances to carry_forward_balances', () => {
    const snap = { totals: { openingStock: 100, payables: 0, receivables: 0 } };
    expect(toRow({ carryForwardBalances: snap })).toEqual({ carry_forward_balances: snap });
    expect(fromRow({ carry_forward_balances: snap })).toEqual({ carryForwardBalances: snap });
  });

  it('maps treasurySplits to treasury_splits', () => {
    const splits = [{ vaultId: 'v1', amount: 500 }];
    expect(toRow({ treasurySplits: splits })).toEqual({ treasury_splits: splits });
    expect(fromRow({ treasury_splits: splits })).toEqual({ treasurySplits: splits });
  });
});
