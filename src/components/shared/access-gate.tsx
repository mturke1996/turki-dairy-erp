'use client';

import { ShieldAlert } from 'lucide-react';
import { usePermission } from '@/lib/store/use-permission';
import type { Permission } from '@/lib/domain/constants';

/** يحجب محتوى الصفحة عن الأدوار غير المصرّح لها. */
export function AccessGate({
  permission,
  children,
}: {
  permission: Permission;
  children: React.ReactNode;
}) {
  const allowed = usePermission(permission);
  if (allowed) return <>{children}</>;

  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-rose-100">
        <ShieldAlert className="h-7 w-7 stroke-[1.6]" />
      </span>
      <h2 className="text-lg font-bold text-foreground">لا تملك صلاحية الوصول</h2>
      <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
        هذه الصفحة متاحة لأدوار محددة فقط. يمكنك تبديل الدور من صفحة الإعدادات لاختبار النظام.
      </p>
    </div>
  );
}
