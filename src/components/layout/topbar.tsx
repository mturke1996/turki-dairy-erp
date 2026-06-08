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
    <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-md">
      <div className="flex h-[4.25rem] items-center gap-2 px-3 sm:gap-3 sm:px-5">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 lg:hidden"
          onClick={onMenuClick}
          aria-label="القائمة"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* جوال — الشعار فقط (النص في السايدبار على سطح المكتب) */}
        <Link href="/dashboard" className="flex shrink-0 items-center lg:hidden" aria-label={BRAND.fullName}>
          <BrandLogo variant="mark" priority />
        </Link>

        <div className="flex-1" aria-hidden />

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <SessionSwitcher />
          <CloudSyncButton />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
