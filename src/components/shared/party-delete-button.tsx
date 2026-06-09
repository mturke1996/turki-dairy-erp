'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { usePermission } from '@/lib/store/use-permission';

export function PartyDeleteButton({
  label,
  onConfirm,
  variant = 'outline',
}: {
  label: string;
  onConfirm: () => Promise<{ ok: boolean; error?: string }>;
  variant?: 'outline' | 'ghost';
}) {
  const canDelete = usePermission('transactions.delete');
  const [busy, setBusy] = useState(false);
  if (!canDelete) return null;

  async function click() {
    if (!confirm(`حذف ${label}؟ لا يمكن التراجع.`)) return;
    setBusy(true);
    try {
      const res = onConfirm();
      const result = res instanceof Promise ? await res : res;
      if (result.ok) toast.success('تم الحذف');
      else toast.error(result.error ?? 'تعذّر الحذف');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" size="sm" variant={variant} className="text-rose-700" disabled={busy} onClick={click}>
      <Trash2 className="h-4 w-4" />
      {busy ? 'جارٍ الحذف…' : 'حذف'}
    </Button>
  );
}
