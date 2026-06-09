import { describe, expect, it } from 'vitest';
import { computeAdjustedNetPosition } from '@/lib/domain/treasury';

describe('computeAdjustedNetPosition', () => {
  it('applies sequential settlement formula', () => {
    const r = computeAdjustedNetPosition({
      cash: 100_000,
      receivables: 30_000,
      inventoryValue: 50_000,
      payables: 20_000,
    });
    expect(r.finalBalance).toBe(160_000);
    expect(r.steps).toHaveLength(4);
    expect(r.steps[0].runningTotal).toBe(100_000);
    expect(r.steps[1].runningTotal).toBe(130_000);
    expect(r.steps[2].runningTotal).toBe(180_000);
    expect(r.steps[3].runningTotal).toBe(160_000);
  });
});
