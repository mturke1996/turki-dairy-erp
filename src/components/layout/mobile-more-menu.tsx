'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid } from 'lucide-react';
import { MobileSheet } from '@/components/ui/mobile-sheet';
import { NAV_ITEMS } from '@/components/layout/nav-config';
import { useRole } from '@/lib/store/use-permission';
import { can } from '@/lib/domain/constants';
import { cn } from '@/lib/utils';

const PRIMARY_HREFS = new Set(['/dashboard', '/supply', '/sales', '/farmers']);

const GROUP_LABELS: Record<string, string> = {
  main: 'العمليات',
  finance: 'المالية',
  parties: 'الأطراف',
  system: 'النظام',
};

export function MobileMoreMenu() {
  const pathname = usePathname();
  const role = useRole();
  const [open, setOpen] = useState(false);

  const moreItems = NAV_ITEMS.filter(
    (item) => !PRIMARY_HREFS.has(item.href) && (!item.permission || can(role, item.permission)),
  );

  const active = moreItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  const groups = ['main', 'finance', 'parties', 'system'] as const;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex min-h-[58px] w-full touch-manipulation select-none flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors',
          active ? 'text-meadow-600' : 'text-muted-foreground',
        )}
      >
        <span
          className={cn(
            'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
            active && 'bg-meadow-50',
          )}
        >
          <LayoutGrid className="h-[19px] w-[19px] stroke-[1.7]" />
        </span>
        المزيد
      </button>

      <MobileSheet open={open} onOpenChange={setOpen} title="جميع الأقسام" description="تنقّل سريع بين وحدات المنظومة.">
        <div className="space-y-5">
          {groups.map((group) => {
            const items = moreItems.filter((i) => i.group === group);
            if (!items.length) return null;
            return (
              <div key={group}>
                <p className="mb-2 text-[11px] font-semibold text-muted-foreground">{GROUP_LABELS[group]}</p>
                <div className="grid grid-cols-2 gap-2">
                  {items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex min-h-[48px] touch-manipulation items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[12.5px] font-medium transition-colors active:scale-[0.98]',
                          isActive
                            ? 'border-meadow-200 bg-meadow-50 text-meadow-800'
                            : 'border-border bg-card active:bg-canvas-sunken',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 stroke-[1.7]" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </MobileSheet>
    </>
  );
}
