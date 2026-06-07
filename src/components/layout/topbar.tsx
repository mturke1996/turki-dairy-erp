'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLogo } from './brand-logo';
import { CloudSyncButton } from './cloud-sync-button';
import { SessionSwitcher } from './session-switcher';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';
import { BRAND } from '@/lib/brand';

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="القائمة">
        <Menu className="h-5 w-5" />
      </Button>

      <Link href="/dashboard" className="flex items-center gap-2.5 lg:hidden" aria-label={BRAND.name}>
        <BrandLogo variant="mark" />
        <span className="truncate text-[13px] font-semibold text-foreground">{BRAND.name}</span>
      </Link>

      <div className="hidden flex-1 lg:block" />
      <div className="flex-1 lg:hidden" />

      <SessionSwitcher />
      <CloudSyncButton />
      <ThemeToggle />
      <UserMenu />
    </header>
  );
}
