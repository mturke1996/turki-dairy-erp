'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Droplets, ShoppingCart, Tractor, MoreHorizontal, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, NAV_GROUPS } from './nav-config';
import { useRole } from '@/lib/store/use-permission';
import { can } from '@/lib/domain/constants';

interface PrimaryTab {
  href: string;
  label: string;
  icon: LucideIcon;
}

const PRIMARY: PrimaryTab[] = [
  { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { href: '/supply', label: 'توريد', icon: Droplets },
  { href: '/sales', label: 'بيع', icon: ShoppingCart },
  { href: '/farmers', label: 'الفلاحون', icon: Tractor },
];

const PRIMARY_HREFS = new Set(PRIMARY.map((p) => p.href));

export function BottomNav() {
  const pathname = usePathname();
  const role = useRole();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const moreItems = NAV_ITEMS.filter(
    (i) => !PRIMARY_HREFS.has(i.href) && (!i.permission || can(role, i.permission)),
  );
  const moreActive = moreItems.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 pb-[env(safe-area-inset-bottom)]">
          {PRIMARY.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex min-h-[58px] touch-manipulation select-none flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors',
                  active ? 'text-meadow-600' : 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                    active && 'bg-meadow-50',
                  )}
                >
                  <Icon className="h-[19px] w-[19px] stroke-[1.7]" />
                </span>
                {tab.label}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex min-h-[58px] touch-manipulation select-none flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors',
              moreActive || moreOpen ? 'text-meadow-600' : 'text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                (moreActive || moreOpen) && 'bg-meadow-50',
              )}
            >
              <MoreHorizontal className="h-[19px] w-[19px] stroke-[1.7]" />
            </span>
            المزيد
          </button>
        </div>
      </nav>

      {/* بوتوم شيت "المزيد" */}
      <div className={cn('fixed inset-0 z-50 lg:hidden', moreOpen ? 'pointer-events-auto' : 'pointer-events-none')}>
        <div
          className={cn(
            'absolute inset-0 bg-navy-950/40 backdrop-blur-sm transition-opacity duration-300',
            moreOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setMoreOpen(false)}
        />
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-lift transition-transform duration-300 ease-drawer',
            moreOpen ? 'translate-y-0' : 'translate-y-full',
          )}
        >
          <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-5 py-3.5">
            <h2 className="text-[15px] font-bold text-foreground">المزيد</h2>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-lg text-muted-foreground hover:bg-canvas-sunken"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-5 px-4 py-4">
            {NAV_GROUPS.map((group) => {
              const items = moreItems.filter((i) => i.group === group.id);
              if (!items.length) return null;
              return (
                <div key={group.id} className="space-y-2">
                  <p className="px-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {items.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex touch-manipulation items-center gap-2.5 rounded-xl border px-3 py-3 text-[13px] font-medium transition-colors',
                            active
                              ? 'border-meadow-200 bg-meadow-50 text-meadow-800'
                              : 'border-border bg-canvas-sunken/40 text-ink-soft active:bg-canvas-sunken',
                          )}
                        >
                          <Icon className="h-[18px] w-[18px] shrink-0 stroke-[1.6]" />
                          <span className="flex-1">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
