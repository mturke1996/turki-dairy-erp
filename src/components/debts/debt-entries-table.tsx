'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, CheckCircle2, HandCoins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Money } from '@/components/shared/money';
import { DebtFormDialog } from '@/components/debts/debt-form-dialog';
import { DebtSettleDialog } from '@/components/debts/debt-settle-dialog';
import { useErpStore } from '@/lib/store/use-erp-store';
import { useCanEdit } from '@/lib/store/use-permission';
import { DEBT_PARTY_LABELS } from '@/lib/domain/constants';
import {
  DEBT_DIRECTION_LABELS,
  debtRemainingAmount,
  filterDebtsByStatus,
  isDebtFullySettled,
  resolveDebtDirection,
} from '@/lib/domain/debt';
import type { DebtEntry } from '@/lib/domain/types';
import { cn, formatShortDate } from '@/lib/utils';

function DebtEntryActions({
  entry,
  settled,
  deletingId,
  onSettle,
  onEdit,
  onRemove,
  layout,
}: {
  entry: DebtEntry;
  settled: boolean;
  deletingId: string | null;
  onSettle: () => void;
  onEdit: () => void;
  onRemove: () => void;
  layout: 'row' | 'stack';
}) {
  const settleBtn = !settled ? (
    <Button
      type="button"
      size="sm"
      variant="meadow"
      className={cn('gap-1 text-[12px]', layout === 'stack' ? 'h-11 flex-1' : 'h-8 px-2.5')}
      onClick={onSettle}
    >
      <HandCoins className="h-4 w-4" />
      تسوية
    </Button>
  ) : null;

  const editBtn = (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={cn('h-9 w-9', layout === 'stack' && 'h-11 w-11 shrink-0')}
      onClick={onEdit}
      aria-label="تعديل"
    >
      <Pencil className="h-4 w-4" />
    </Button>
  );

  const deleteBtn = (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={cn('h-9 w-9 text-rose-600', layout === 'stack' && 'h-11 w-11 shrink-0')}
      disabled={deletingId === entry.id}
      onClick={onRemove}
      aria-label="حذف"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );

  if (layout === 'stack') {
    return (
      <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3">
        {settleBtn}
        <div className="mr-auto flex gap-1">{editBtn}{deleteBtn}</div>
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-1">
      {settleBtn}
      {editBtn}
      {deleteBtn}
    </div>
  );
}

export function DebtEntriesTable({
  entries,
  variant = 'open',
  emptyMessage,
}: {
  entries: DebtEntry[];
  /** open = ديون قائمة · settled = المُسَدَّدة */
  variant?: 'open' | 'settled';
  emptyMessage?: string;
}) {
  const deleteDebtEntry = useErpStore((s) => s.deleteDebtEntry);
  const canEdit = useCanEdit();
  const farmers = useErpStore((s) => s.farmers);
  const customers = useErpStore((s) => s.customers);
  const employees = useErpStore((s) => s.employees);
  const [editEntry, setEditEntry] = useState<DebtEntry | null>(null);
  const [settleEntry, setSettleEntry] = useState<DebtEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const visible = useMemo(
    () => filterDebtsByStatus(entries, variant),
    [entries, variant],
  );

  function partyLabel(e: DebtEntry) {
    if (e.partyKind === 'external') return e.partyName ?? 'خارجي';
    if (e.partyKind === 'farmer') return farmers.find((f) => f.id === e.partyId)?.fullName ?? '—';
    if (e.partyKind === 'customer') return customers.find((c) => c.id === e.partyId)?.entityName ?? '—';
    return employees.find((x) => x.id === e.partyId)?.fullName ?? '—';
  }

  async function remove(entry: DebtEntry) {
    const settled = isDebtFullySettled(entry);
    const msg = settled
      ? `حذف الدين المُسَدَّد ${entry.ref}؟ سيُزال من السجل نهائياً.`
      : (entry.settledAmount ?? 0) > 0.01
        ? `حذف ${entry.ref}؟ يوجد تسوية جزئية — ستُحذف الدفعات المرتبطة أيضاً.`
        : `حذف الدين ${entry.ref}؟`;
    if (!confirm(msg)) return;
    setDeletingId(entry.id);
    try {
      const res = await deleteDebtEntry(entry.id);
      if (res.ok) toast.success('تم حذف الدين');
      else toast.error(res.error ?? 'تعذّر الحذف');
    } finally {
      setDeletingId(null);
    }
  }

  function renderAmount(e: DebtEntry, settled: boolean, remaining: number, original: number) {
    if (settled) {
      return (
        <Money
          value={e.settledAmount ?? original}
          decimals={0}
          className="font-semibold text-meadow-800"
        />
      );
    }
    return (
      <>
        <Money value={remaining} decimals={0} className="text-[15px] font-bold" />
        {(e.settledAmount ?? 0) > 0.01 ? (
          <p className="text-[10.5px] text-muted-foreground">
            من أصل {Math.round(original).toLocaleString('ar-LY')}
          </p>
        ) : null}
      </>
    );
  }

  if (!visible.length) {
    return (
      <p className="py-6 text-center text-[13px] text-muted-foreground">
        {emptyMessage ??
          (variant === 'open' ? 'لا ديون قائمة حالياً.' : 'لا ديون مُسَدَّدة بعد.')}
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2.5 md:hidden">
        {visible.map((e) => {
          const settled = isDebtFullySettled(e);
          const remaining = debtRemainingAmount(e);
          const original = remaining + (e.settledAmount ?? 0);
          const direction = resolveDebtDirection(e);
          return (
            <article
              key={e.id}
              className={cn(
                'rounded-xl border border-border bg-card p-4 shadow-sm',
                variant === 'settled' && 'border-meadow-200/60 bg-meadow-50/20',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold">{partyLabel(e)}</p>
                  <p className="mt-0.5 font-mono text-[10.5px] text-muted-foreground" dir="ltr">{e.ref}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="neutral" className="text-[10px]">{DEBT_PARTY_LABELS[e.partyKind]}</Badge>
                    <Badge variant={direction === 'payable' ? 'danger' : 'success'} className="text-[10px]">
                      {DEBT_DIRECTION_LABELS[direction]}
                    </Badge>
                    {settled ? (
                      <Badge variant="success" className="gap-1 text-[10px]">
                        <CheckCircle2 className="h-3 w-3" />
                        مُسَدَّد
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="text-[10px]">قائم</Badge>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-left">{renderAmount(e, settled, remaining, original)}</div>
              </div>
              {e.description ? (
                <p className="mt-2 line-clamp-2 text-[12px] text-muted-foreground">{e.description}</p>
              ) : null}
              <p className="mt-2 text-[11px] text-muted-foreground">
                {formatShortDate(e.date)}
                {e.settledAt ? (
                  <span className="mr-2 text-meadow-700">· تُسَدَّد {formatShortDate(e.settledAt)}</span>
                ) : null}
              </p>
              {canEdit ? (
                <DebtEntryActions
                  entry={e}
                  settled={settled}
                  deletingId={deletingId}
                  layout="stack"
                  onSettle={() => setSettleEntry(e)}
                  onEdit={() => setEditEntry(e)}
                  onRemove={() => remove(e)}
                />
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المرجع</TableHead>
              <TableHead>الطرف</TableHead>
              <TableHead>الاتجاه</TableHead>
              <TableHead className="text-left">{variant === 'settled' ? 'المُسَدَّد' : 'المتبقي'}</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((e) => {
              const settled = isDebtFullySettled(e);
              const remaining = debtRemainingAmount(e);
              const original = remaining + (e.settledAmount ?? 0);
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-[11px]" dir="ltr">{e.ref}</TableCell>
                  <TableCell>
                    <p className="text-[13px] font-medium">{partyLabel(e)}</p>
                    <Badge variant="neutral" className="mt-0.5 text-[10px]">{DEBT_PARTY_LABELS[e.partyKind]}</Badge>
                  </TableCell>
                  <TableCell className="text-[12px]">{DEBT_DIRECTION_LABELS[resolveDebtDirection(e)]}</TableCell>
                  <TableCell className="text-left">{renderAmount(e, settled, remaining, original)}</TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">
                    {formatShortDate(e.date)}
                    {e.settledAt ? (
                      <p className="text-[10px] text-meadow-700">تُسَدَّد {formatShortDate(e.settledAt)}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <DebtEntryActions
                        entry={e}
                        settled={settled}
                        deletingId={deletingId}
                        layout="row"
                        onSettle={() => setSettleEntry(e)}
                        onEdit={() => setEditEntry(e)}
                        onRemove={() => remove(e)}
                      />
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <DebtFormDialog open={!!editEntry} onOpenChange={(o) => !o && setEditEntry(null)} entry={editEntry} />
      <DebtSettleDialog open={!!settleEntry} onOpenChange={(o) => !o && setSettleEntry(null)} entry={settleEntry} />
    </>
  );
}
