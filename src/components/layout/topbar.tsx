'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CloudSyncButton } from './cloud-sync-button';
import { SessionSwitcher } from './session-switcher';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="القائمة">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      <SessionSwitcher />
      <CloudSyncButton />
      <ThemeToggle />
      <UserMenu />
    </header>
  );
}
