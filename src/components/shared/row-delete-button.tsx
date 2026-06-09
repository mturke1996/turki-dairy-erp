'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermission } from '@/lib/store/use-permission';

export function RowDeleteButton({
  label,
  onConfirm,
  allowed,
  showLabel,
}: {
  label: string;
  onConfirm: () => Promise<{ ok: boolean; error?: string }>;
  /** تجاوز صلاحية الحذف الافتراضية (مثلاً supply.record في المخزون) */
  allowed?: boolean;
  showLabel?: boolean;
}) {
  const canDeleteAdmin = usePermission('transactions.delete');
  const canDelete = allowed ?? canDeleteAdmin;
  const [busy, setBusy] = useState(false);
  if (!canDelete) return null;

  async function click() {
    if (!confirm(`حذف ${label}؟ لا يمكن التراجع.`)) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  if (showLabel) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 gap-1 text-[11px] text-rose-600 hover:text-rose-700"
        disabled={busy}
        onClick={click}
        aria-label={`حذف ${label}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
        حذف
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="h-8 w-8 text-rose-600 hover:text-rose-700"
      disabled={busy}
      onClick={click}
      aria-label={`حذف ${label}`}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
