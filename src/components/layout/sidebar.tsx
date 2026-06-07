'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BrandLogo } from './brand-logo';
import { NAV_ITEMS, NAV_GROUPS } from './nav-config';
import { useRole } from '@/lib/store/use-permission';
import { can } from '@/lib/domain/constants';
import { BRAND } from '@/lib/brand';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const role = useRole();

  return (
    <div className="flex h-full flex-col bg-card">
      {/* الشعار */}
      <div className="border-b border-border px-4 py-5">
        <Link href="/dashboard" onClick={onNavigate} className="block transition-opacity hover:opacity-90">
          <BrandLogo variant="lockup" className="w-full" />
        </Link>
        <p className="mt-2 truncate text-center text-[10.5px] font-medium text-muted-foreground">{BRAND.tagline}</p>
      </div>

      {/* التنقّل */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 no-scrollbar">
        {NAV_GROUPS.map((group) => {
          const items = NAV_ITEMS.filter(
            (i) => i.group === group.id && (!i.permission || can(role, i.permission)),
          );
          if (!items.length) return null;
          return (
            <div key={group.id} className="space-y-1">
              <p className="px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                {group.label}
              </p>
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors',
                      active
                        ? 'bg-navy-700 text-white shadow-whisper'
                        : 'text-ink-soft hover:bg-canvas-sunken hover:text-foreground',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px] shrink-0 stroke-[1.6]',
                        active ? 'text-white' : 'text-muted-foreground group-hover:text-navy-600',
                      )}
                    />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* التذييل */}
      <div className="border-t border-border px-4 py-3">
        <div className="rounded-lg bg-canvas-sunken px-3 py-2.5">
          <p className="text-[11px] font-semibold text-ink-soft">{BRAND.fullName}</p>
          <p className="mt-0.5 text-[10.5px] text-muted-foreground">{BRAND.contact.address}</p>
        </div>
      </div>
    </div>
  );
}
