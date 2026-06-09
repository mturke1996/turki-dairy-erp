'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, CheckCircle2, HandCoins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Money } from '@/components/shared/money';
import { DebtFormDialog } from '@/components/debts/debt-form-dialog';
import { DebtSettleDialog } from '@/components/debts/debt-settle-dialog';
import { useErpStore } from '@/lib/store/use-erp-store';
import { DEBT_PARTY_LABELS } from '@/lib/domain/constants';
import { DEBT_DIRECTION_LABELS, debtRemainingAmount, isDebtFullySettled, resolveDebtDirection } from '@/lib/domain/debt';
import type { DebtEntry } from '@/lib/domain/types';
import { formatShortDate } from '@/lib/utils';

export function DebtEntriesTable({ entries }: { entries: DebtEntry[] }) {
  const deleteDebtEntry = useErpStore((s) => s.deleteDebtEntry);
  const farmers = useErpStore((s) => s.farmers);
  const customers = useErpStore((s) => s.customers);
  const employees = useErpStore((s) => s.employees);
  const [editEntry, setEditEntry] = useState<DebtEntry | null>(null);
  const [settleEntry, setSettleEntry] = useState<DebtEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function partyLabel(e: DebtEntry) {
    if (e.partyKind === 'external') return e.partyName ?? 'خارجي';
    if (e.partyKind === 'farmer') return farmers.find((f) => f.id === e.partyId)?.fullName ?? '—';
    if (e.partyKind === 'customer') return customers.find((c) => c.id === e.partyId)?.entityName ?? '—';
    return employees.find((x) => x.id === e.partyId)?.fullName ?? '—';
  }

  async function remove(id: string, ref: string) {
    if (!confirm(`حذف الدين ${ref}؟`)) return;
    setDeletingId(id);
    try {
      const res = await deleteDebtEntry(id);
      if (res.ok) toast.success('تم حذف الدين');
      else toast.error(res.error ?? 'تعذّر الحذف');
    } finally {
      setDeletingId(null);
    }
  }

  if (!entries.length) return null;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>المرجع</TableHead>
            <TableHead>الطرف</TableHead>
            <TableHead>الاتجاه</TableHead>
            <TableHead className="text-left">المبلغ / المتبقي</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>التاريخ</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((e) => {
            const settled = isDebtFullySettled(e);
            const remaining = debtRemainingAmount(e);
            const original = remaining + (e.settledAmount ?? 0);
            return (
              <TableRow key={e.id} className={settled ? 'opacity-60' : undefined}>
                <TableCell className="font-mono text-[11px]" dir="ltr">
                  {e.ref}
                </TableCell>
                <TableCell>
                  <p className="text-[13px] font-medium">{partyLabel(e)}</p>
                  <Badge variant="neutral" className="mt-0.5 text-[10px]">
                    {DEBT_PARTY_LABELS[e.partyKind]}
                  </Badge>
                </TableCell>
                <TableCell className="text-[12px]">{DEBT_DIRECTION_LABELS[resolveDebtDirection(e)]}</TableCell>
                <TableCell className="text-left">
                  {settled ? (
                    <Money value={e.settledAmount ?? original} decimals={0} className="font-semibold text-muted-foreground line-through" />
                  ) : (
                    <>
                      <Money value={remaining} decimals={0} className="font-semibold" />
                      {(e.settledAmount ?? 0) > 0.01 ? (
                        <p className="text-[10px] text-muted-foreground">
                          من أصل {Math.round(original).toLocaleString('ar-LY')}
                        </p>
                      ) : null}
                    </>
                  )}
                </TableCell>
                <TableCell>
                  {settled ? (
                    <Badge variant="success" className="gap-1 text-[10px]">
                      <CheckCircle2 className="h-3 w-3" />
                      مُسَدَّد
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="text-[10px]">
                      قائم
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-[12px] text-muted-foreground">{formatShortDate(e.date)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {!settled ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 px-2 text-[11px]"
                        onClick={() => setSettleEntry(e)}
                      >
                        <HandCoins className="h-3.5 w-3.5" />
                        تسوية
                      </Button>
                    ) : null}
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditEntry(e)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-rose-600"
                      disabled={deletingId === e.id}
                      onClick={() => remove(e.id, e.ref)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <DebtFormDialog open={!!editEntry} onOpenChange={(o) => !o && setEditEntry(null)} entry={editEntry} />
      <DebtSettleDialog open={!!settleEntry} onOpenChange={(o) => !o && setSettleEntry(null)} entry={settleEntry} />
    </>
  );
}
