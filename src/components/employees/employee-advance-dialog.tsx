'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/shared/field';
import { Money, moneyText } from '@/components/shared/money';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  EMPTY_SPLIT_STATE,
  SplitPaymentFields,
  treasurySelectionFromState,
  validateSplitPaymentState,
  type SplitPaymentState,
} from '@/components/treasury/split-payment-fields';
import { PAYMENT_METHOD_LABELS } from '@/lib/domain/constants';
import type {
  AccountSourceType,
  BankAccount,
  CashMovement,
  CashVault,
  PaymentMethod,
  TreasurySplitPart,
} from '@/lib/domain/types';
import type { EmployeeStats } from '@/lib/domain/calculations';

export function EmployeeAdvanceDialog({
  employee,
  open,
  onOpenChange,
  vaults,
  banks,
  cashMovements,
  onSubmit,
}: {
  employee: EmployeeStats | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vaults: CashVault[];
  banks: BankAccount[];
  cashMovements: CashMovement[];
  onSubmit: (input: {
    employeeId: string;
    amount: number;
    method: PaymentMethod;
    sourceType?: AccountSourceType;
    sourceId?: string;
    splits?: TreasurySplitPart[];
    notes?: string;
  }) => void;
}) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [treasury, setTreasury] = useState<SplitPaymentState>(EMPTY_SPLIT_STATE);
  const [notes, setNotes] = useState('');

  function submit() {
    if (!employee) return;
    const val = Number(amount);
    if (!val || val <= 0) return toast.error('أدخل مبلغ الدين');
    const splitErr = validateSplitPaymentState(val, treasury, {
      checkOutflow: true,
      vaults,
      banks,
      cashMovements,
    });
    if (splitErr) return toast.error(splitErr);
    const treasurySel = treasurySelectionFromState(val, treasury);
    onSubmit({
      employeeId: employee.id,
      amount: val,
      method,
      ...treasurySel,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setAmount('');
          setTreasury(EMPTY_SPLIT_STATE);
          setNotes('');
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تسجيل دين موظف</DialogTitle>
          <DialogDescription>
            {employee ? (
              <>
                {employee.fullName} — الدين الحالي{' '}
                <Money value={employee.advanceBalance} decimals={0} className="inline font-semibold" />
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="المبلغ" required>
            <Input type="number" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </Field>
          <Field label="طريقة الدفع">
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                  <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <SplitPaymentFields
            totalAmount={Number(amount) || 0}
            vaults={vaults}
            banks={banks}
            cashMovements={cashMovements}
            state={treasury}
            onChange={setTreasury}
            singleLabel="مصدر الصرف"
            outflow
          />

          <Field label="ملاحظات">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          {amount && Number(amount) > 0 ? (
            <p className="text-[12px] text-muted-foreground">
              سيتم صرف {moneyText(Number(amount), 0)} وتسجيلها كدين على الموظف.
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button onClick={submit}>
            <Wallet className="h-4 w-4" />
            تأكيد الدين
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
