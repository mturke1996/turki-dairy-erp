'use client';

import { Money } from '@/components/shared/money';
import type { SalaryFormPreview } from '@/lib/domain/payroll';

export function SalaryFormPreview({ preview }: { preview: SalaryFormPreview }) {
  if (preview.storedTotal <= 0) return null;

  return (
    <div
      className="space-y-2 rounded-lg border border-border bg-canvas-sunken/60 px-3 py-2.5 text-xs text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <p>
        {preview.storedLabel}:{' '}
        <Money value={preview.storedTotal} decimals={0} className="inline font-semibold text-foreground" />
      </p>
      {preview.batchLines.map((line) => (
        <p key={line.label}>
          {line.label}:{' '}
          <Money value={line.amount} decimals={0} className="inline font-semibold text-foreground" />
        </p>
      ))}
      <p className="border-t border-border/80 pt-2">
        كلفة شهرية تقديرية:{' '}
        <Money value={preview.monthlyCost} decimals={0} className="inline font-semibold text-foreground" />
      </p>
    </div>
  );
}
