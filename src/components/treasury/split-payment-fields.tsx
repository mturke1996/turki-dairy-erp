'use client';

import { useMemo } from 'react';
import { SplitSquareHorizontal } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/shared/field';
import { Money, moneyText } from '@/components/shared/money';
import { AmountInput } from '@/components/shared/amount-input';
import { PayoutSourceSelect } from '@/components/employees/payout-source-select';
import { accountBalance } from '@/lib/domain/treasury';
import { equalSplitAmounts } from '@/lib/domain/treasury-splits';
import type { AccountSourceType, BankAccount, CashMovement, CashVault, TreasurySplitPart } from '@/lib/domain/types';
import { cn } from '@/lib/utils';

export type TreasuryAccountOption = {
  value: string;
  label: string;
  type: AccountSourceType;
  id: string;
};

export function buildTreasuryAccountOptions(vaults: CashVault[], banks: BankAccount[]): TreasuryAccountOption[] {
  return [
    ...vaults
      .filter((v) => v.isActive)
      .map((v) => ({ value: `vault:${v.id}`, label: v.name, type: 'vault' as const, id: v.id })),
    ...banks
      .filter((b) => b.isActive)
      .map((b) => ({ value: `bank:${b.id}`, label: b.bankName, type: 'bank' as const, id: b.id })),
  ];
}

export type SplitPaymentState = {
  enabled: boolean;
  singleSource: string;
  part1Amount: string;
  part1Source: string;
  part2Amount: string;
  part2Source: string;
};

export const EMPTY_SPLIT_STATE: SplitPaymentState = {
  enabled: false,
  singleSource: 'none',
  part1Amount: '',
  part1Source: '',
  part2Amount: '',
  part2Source: '',
};

export function parseAccountValue(value: string): { type: AccountSourceType; id: string } | null {
  if (!value || value === 'none') return null;
  const [type, id] = value.split(':') as [AccountSourceType, string];
  if (!type || !id) return null;
  return { type, id };
}

export function treasurySelectionFromState(
  totalAmount: number,
  state: SplitPaymentState,
): {
  sourceType?: AccountSourceType;
  sourceId?: string;
  splits?: TreasurySplitPart[];
} {
  if (state.enabled) {
    const p1 = parseAccountValue(state.part1Source);
    const p2 = parseAccountValue(state.part2Source);
    const a1 = Number(state.part1Amount) || 0;
    const a2 = Number(state.part2Amount) || 0;
    if (!p1 || !p2 || a1 <= 0 || a2 <= 0) return {};
    return {
      splits: [
        { sourceType: p1.type, sourceId: p1.id, amount: a1 },
        { sourceType: p2.type, sourceId: p2.id, amount: a2 },
      ],
    };
  }
  const single = parseAccountValue(state.singleSource);
  if (!single) return {};
  return { sourceType: single.type, sourceId: single.id };
}

export function validateSplitPaymentState(
  totalAmount: number,
  state: SplitPaymentState,
  options: {
    allowNone?: boolean;
    checkOutflow?: boolean;
    vaults: CashVault[];
    banks: BankAccount[];
    cashMovements: CashMovement[];
    creditBack?: CashMovement[];
  },
): string | null {
  const total = totalAmount;
  if (total <= 0) return 'أدخل مبلغاً صحيحاً.';

  if (!state.enabled) {
    if (state.singleSource === 'none') {
      return options.allowNone ? null : 'اختر حساب الخزينة أو البنك.';
    }
    return null;
  }

  const p1 = parseAccountValue(state.part1Source);
  const p2 = parseAccountValue(state.part2Source);
  const a1 = Number(state.part1Amount) || 0;
  const a2 = Number(state.part2Amount) || 0;

  if (!p1 || !p2) return 'اختر حسابين مختلفين للتقسيم.';
  if (p1.type === p2.type && p1.id === p2.id) return 'يجب اختيار حسابين مختلفين.';
  if (a1 <= 0 || a2 <= 0) return 'أدخل مبلغاً لكل جزء.';
  if (Math.abs(a1 + a2 - total) > 0.02) {
    return `مجموع الأجزاء (${moneyText(a1 + a2, 0)}) يجب أن يساوي الإجمالي (${moneyText(total, 0)}).`;
  }

  if (options.checkOutflow) {
    for (const [part, acc] of [
      [a1, p1],
      [a2, p2],
    ] as const) {
      const bal = accountBalance(acc.type, acc.id, options.vaults, options.banks, options.cashMovements);
      const credited = (options.creditBack ?? [])
        .filter((m) => m.sourceType === acc.type && m.sourceId === acc.id)
        .reduce((s, m) => s + m.amount, 0);
      if (part > bal + credited + 0.001) {
        return `رصيد أحد الحسابين لا يكفي للجزء المحدد.`;
      }
    }
  }

  return null;
}

type Props = {
  totalAmount: number;
  vaults: CashVault[];
  banks: BankAccount[];
  cashMovements: CashMovement[];
  state: SplitPaymentState;
  onChange: (next: SplitPaymentState) => void;
  /** تسمية حقل الحساب الواحد */
  singleLabel: string;
  /** تسمية عند التقسيم — صرف أو إيداع */
  outflow?: boolean;
  allowNone?: boolean;
  /** false = دفعة واحدة من حساب واحد فقط (بدون تقسيم) */
  allowSplit?: boolean;
  disabled?: boolean;
  creditBack?: CashMovement[];
  className?: string;
};

export function SplitPaymentFields({
  totalAmount,
  vaults,
  banks,
  cashMovements,
  state,
  onChange,
  singleLabel,
  outflow = true,
  allowNone = false,
  allowSplit = true,
  disabled,
  creditBack = [],
  className,
}: Props) {
  const accounts = useMemo(() => buildTreasuryAccountOptions(vaults, banks), [vaults, banks]);
  const total = totalAmount;

  const selectedSingle = accounts.find((a) => a.value === state.singleSource) ?? null;
  const singleBalance = selectedSingle
    ? accountBalance(selectedSingle.type, selectedSingle.id, vaults, banks, cashMovements) +
      creditBack
        .filter((m) => m.sourceType === selectedSingle.type && m.sourceId === selectedSingle.id)
        .reduce((s, m) => s + m.amount, 0)
    : 0;

  const part1Acc = parseAccountValue(state.part1Source);
  const part2Acc = parseAccountValue(state.part2Source);
  const part1Bal =
    part1Acc
      ? accountBalance(part1Acc.type, part1Acc.id, vaults, banks, cashMovements) +
        creditBack
          .filter((m) => m.sourceType === part1Acc.type && m.sourceId === part1Acc.id)
          .reduce((s, m) => s + m.amount, 0)
      : 0;
  const part2Bal =
    part2Acc
      ? accountBalance(part2Acc.type, part2Acc.id, vaults, banks, cashMovements) +
        creditBack
          .filter((m) => m.sourceType === part2Acc.type && m.sourceId === part2Acc.id)
          .reduce((s, m) => s + m.amount, 0)
      : 0;

  const sumParts = (Number(state.part1Amount) || 0) + (Number(state.part2Amount) || 0);
  const splitEnabled = allowSplit && state.enabled;
  const splitValid = splitEnabled && total > 0 && Math.abs(sumParts - total) <= 0.02;

  function setField<K extends keyof SplitPaymentState>(key: K, value: SplitPaymentState[K]) {
    onChange({ ...state, [key]: value });
  }

  function applyEqualSplit() {
    if (total <= 0) return;
    const [half1, half2] = equalSplitAmounts(total);
    onChange({ ...state, part1Amount: String(half1), part2Amount: String(half2) });
  }

  return (
    <div className={cn('space-y-3', className)}>
      {allowSplit ? (
        <div className="flex items-center justify-between rounded-lg border border-border bg-canvas-sunken/50 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <SplitSquareHorizontal className="h-4 w-4 text-navy-600" aria-hidden />
            <div>
              <Label htmlFor="split-toggle" className="text-[13px] font-semibold">
                تقسيم المبلغ بين حسابين
              </Label>
              <p className="text-[11px] text-muted-foreground">مثال: نصف كاش ونصف تحويل بنكي</p>
            </div>
          </div>
          <Switch
            id="split-toggle"
            checked={state.enabled}
            disabled={disabled || accounts.length < 2}
            onCheckedChange={(v) => {
              const next: SplitPaymentState = { ...state, enabled: v };
              if (v && total > 0) {
                const [half1, half2] = equalSplitAmounts(total);
                next.part1Amount = String(half1);
                next.part2Amount = String(half2);
                if (!next.part1Source && accounts[0]) next.part1Source = accounts[0].value;
                if (!next.part2Source && accounts[1]) next.part2Source = accounts[1].value;
              }
              onChange(next);
            }}
          />
        </div>
      ) : null}

      {!splitEnabled ? (
        <>
          <Field
            label={singleLabel}
            hint={accounts.length === 0 ? 'لا توجد خزن/بنوك — أضِفها من صفحة النقد والبنوك' : undefined}
          >
            <Select
              value={state.singleSource}
              onValueChange={(v) => setField('singleSource', v)}
              disabled={disabled || accounts.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={allowNone ? 'بدون تأثير نقدي' : 'اختر حساباً'} />
              </SelectTrigger>
              <SelectContent>
                {allowNone ? <SelectItem value="none">تسجيل فقط (بدون حركة نقدية)</SelectItem> : null}
                {accounts.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {selectedSingle && outflow ? (
            <div className="flex items-center justify-between rounded-lg bg-canvas-sunken px-3 py-2 text-[12px]">
              <span className="text-muted-foreground">رصيد «{selectedSingle.label}»</span>
              <Money value={singleBalance} className="font-semibold" />
            </div>
          ) : null}
        </>
      ) : (
        <div className="space-y-3 rounded-xl border border-navy-100 bg-navy-50/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-semibold text-navy-800">الجزء الأول</p>
            <button
              type="button"
              className="text-[11px] font-medium text-meadow-700 hover:underline"
              onClick={applyEqualSplit}
              disabled={disabled || total <= 0}
            >
              تقسيم متساوٍ
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="المبلغ">
              <AmountInput
                value={state.part1Amount}
                onChange={(v) => setField('part1Amount', v)}
                placeholder="0"
                disabled={disabled}
              />
            </Field>
            <Field label="الحساب">
              <PayoutSourceSelect
                value={state.part1Source}
                onChange={(v) => setField('part1Source', v)}
                vaults={vaults}
                banks={banks}
                disabled={disabled}
              />
            </Field>
          </div>
          {part1Acc && outflow ? (
            <p className="text-[11px] text-muted-foreground">
              الرصيد المتاح: <Money value={part1Bal} className="inline font-semibold" />
            </p>
          ) : null}

          <p className="border-t border-border/60 pt-2 text-[12px] font-semibold text-navy-800">الجزء الثاني</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="المبلغ">
              <AmountInput
                value={state.part2Amount}
                onChange={(v) => setField('part2Amount', v)}
                placeholder="0"
                disabled={disabled}
              />
            </Field>
            <Field label="الحساب">
              <PayoutSourceSelect
                value={state.part2Source}
                onChange={(v) => setField('part2Source', v)}
                vaults={vaults}
                banks={banks}
                disabled={disabled}
              />
            </Field>
          </div>
          {part2Acc && outflow ? (
            <p className="text-[11px] text-muted-foreground">
              الرصيد المتاح: <Money value={part2Bal} className="inline font-semibold" />
            </p>
          ) : null}

          {total > 0 ? (
            <div
              className={cn(
                'flex items-center justify-between rounded-lg px-3 py-2 text-[12px]',
                splitValid ? 'bg-meadow-50 text-meadow-800' : 'bg-rose-50 text-rose-800',
              )}
            >
              <span>مجموع الأجزاء / الإجمالي</span>
              <span className="font-semibold tabular-nums" dir="ltr">
                {moneyText(sumParts, 0)} / {moneyText(total, 0)}
              </span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
