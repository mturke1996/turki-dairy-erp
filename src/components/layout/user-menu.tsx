'use client';

import { useRouter } from 'next/navigation';
import { LogOut, UserCog, ShieldCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useErpStore } from '@/lib/store/use-erp-store';
import { ROLE_LABELS } from '@/lib/domain/constants';
import { initials } from '@/lib/utils';

export function UserMenu() {
  const router = useRouter();
  const auth = useErpStore((s) => s.auth);
  const logout = useErpStore((s) => s.logout);

  if (!auth) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
        <Avatar className="h-8 w-8">
          <AvatarFallback>{initials(auth.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-foreground">{auth.name}</span>
            <span className="text-[11px] font-normal text-muted-foreground">{auth.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <ShieldCheck />
          <span>الصلاحية: {ROLE_LABELS[auth.role]}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <UserCog />
          <span>الإعدادات</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            logout();
            router.push('/login');
          }}
          className="text-rose-600 focus:bg-rose-50 [&>svg]:text-rose-600"
        >
          <LogOut />
          <span>تسجيل الخروج</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
