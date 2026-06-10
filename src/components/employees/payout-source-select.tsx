'use client';

import { useMemo } from 'react';
import { Landmark, Wallet } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { payoutAccountValue } from '@/lib/domain/payroll';
import type { AccountSourceType, BankAccount, CashVault } from '@/lib/domain/types';

export function buildPayoutOptions(
  vaults: CashVault[],
  banks: BankAccount[],
): { value: string; label: string; type: AccountSourceType; id: string }[] {
  return [
    ...vaults
      .filter((v) => v.isActive)
      .map((v) => ({
        value: payoutAccountValue('vault', v.id),
        label: `خزنة: ${v.name}`,
        type: 'vault' as const,
        id: v.id,
      })),
    ...banks
      .filter((b) => b.isActive)
      .map((b) => ({
        value: payoutAccountValue('bank', b.id),
        label: `بنك: ${b.bankName}`,
        type: 'bank' as const,
        id: b.id,
      })),
  ];
}

export function PayoutSourceSelect({
  value,
  onChange,
  vaults,
  banks,
  placeholder = 'اختر خزنة أو بنك',
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  vaults: CashVault[];
  banks: BankAccount[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const options = useMemo(() => buildPayoutOptions(vaults, banks), [vaults, banks]);
  const vaultCount = options.filter((o) => o.type === 'vault').length;

  if (!options.length) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-canvas-sunken px-3 py-2.5 text-[12px] text-muted-foreground">
        لا توجد خزائن أو حسابات بنكية — أعد إعداد الخزينة من صفحة المصاريف أو الخزينة.
      </p>
    );
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-11">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {vaultCount > 0 ? (
          <>
            <div className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Wallet className="h-3 w-3" />
              الخزائن
            </div>
            {options
              .filter((o) => o.type === 'vault')
              .map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
          </>
        ) : null}
        {options.some((o) => o.type === 'bank') ? (
          <>
            <div className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Landmark className="h-3 w-3" />
              الحسابات البنكية
            </div>
            {options
              .filter((o) => o.type === 'bank')
              .map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
          </>
        ) : null}
      </SelectContent>
    </Select>
  );
}
