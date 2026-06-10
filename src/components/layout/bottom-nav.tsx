'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Droplets, ShoppingCart, Tractor } from 'lucide-react';
import { MobileMoreMenu } from '@/components/layout/mobile-more-menu';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRole } from '@/lib/store/use-permission';
import { can, type Permission } from '@/lib/domain/constants';

interface PrimaryTab {
  href: string;
  label: string;
  icon: LucideIcon;
}

const PRIMARY_DEF: (PrimaryTab & { permission?: Permission })[] = [
  { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { href: '/supply', label: 'استلام', icon: Droplets, permission: 'supply.record' },
  { href: '/sales', label: 'بيع', icon: ShoppingCart, permission: 'sales.record' },
  { href: '/farmers', label: 'الفلاحون', icon: Tractor },
];

export function BottomNav() {
  const pathname = usePathname();
  const role = useRole();

  const primary = PRIMARY_DEF.filter((t) => !t.permission || can(role, t.permission));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md lg:hidden" aria-label="التنقّل الرئيسي">
      <div className="mx-auto grid max-w-lg grid-cols-5 pb-[env(safe-area-inset-bottom,0px)]">
        {primary.map((tab) => {
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
        <MobileMoreMenu />
      </div>
    </nav>
  );
}
