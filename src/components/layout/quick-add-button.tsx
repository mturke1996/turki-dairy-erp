'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  PackagePlus,
  Plus,
  Receipt,
  Scale,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MobileSheet } from '@/components/ui/mobile-sheet';
import { can, type Permission } from '@/lib/domain/constants';
import { useRole } from '@/lib/store/use-permission';
import { cn } from '@/lib/utils';

type QuickAction = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  permission?: Permission;
  tone: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    href: '/supply',
    label: 'تسجيل استلام',
    description: 'حليب وارد من الفلاحين',
    icon: ArrowDownToLine,
    permission: 'supply.record',
    tone: 'bg-meadow-50 text-meadow-700 ring-meadow-100',
  },
  {
    href: '/sales',
    label: 'تسجيل بيع',
    description: 'فاتورة بيع للعميل',
    icon: ArrowUpFromLine,
    permission: 'sales.record',
    tone: 'bg-navy-50 text-navy-700 ring-navy-100',
  },
  {
    href: '/debts',
    label: 'تسجيل دين',
    description: 'له أو عليه، لأي طرف',
    icon: Scale,
    tone: 'bg-sun-50 text-sun-800 ring-sun-100',
  },
  {
    href: '/expenses',
    label: 'تسجيل مصروف',
    description: 'خصم مباشر من الخزنة',
    icon: Receipt,
    permission: 'expenses.record',
    tone: 'bg-rose-50 text-rose-700 ring-rose-100',
  },
  {
    href: '/inventory',
    label: 'تسوية مخزون',
    description: 'هدر، جرد أو تصحيح',
    icon: PackagePlus,
    tone: 'bg-canvas-sunken text-ink-soft ring-border',
  },
  {
    href: '/income',
    label: 'مدخول خارجي',
    description: 'إيراد خارج الاستلام والبيع',
    icon: TrendingUp,
    tone: 'bg-meadow-50 text-meadow-700 ring-meadow-100',
  },
  {
    href: '/treasury',
    label: 'تحويل نقدي',
    description: 'بين خزنة وحساب بنكي',
    icon: ArrowLeftRight,
    permission: 'vaults.manage',
    tone: 'bg-navy-50 text-navy-700 ring-navy-100',
  },
];

function ActionList({ actions, onNavigate }: { actions: QuickAction[]; onNavigate?: () => void }) {
  return (
    <div className="grid gap-1.5 pb-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            onClick={onNavigate}
            className="flex min-h-[52px] touch-manipulation items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 transition-colors active:bg-canvas-sunken"
          >
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1', action.tone)}>
              <Icon className="h-5 w-5 stroke-[1.7]" />
            </span>
            <span className="min-w-0 flex-1 text-right">
              <span className="block text-[14px] font-semibold text-foreground">{action.label}</span>
              <span className="block truncate text-[11.5px] text-muted-foreground">{action.description}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

const fabClass = cn(
  'group flex h-14 w-14 items-center justify-center rounded-2xl touch-manipulation',
  'bg-meadow-600 text-white shadow-glow ring-1 ring-meadow-700/20',
  'transition-[transform,box-shadow,background-color] duration-150 ease-out',
  'hover:bg-meadow-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.96]',
);

export function QuickAddButton() {
  const role = useRole();
  const [sheetOpen, setSheetOpen] = useState(false);
  const actions = QUICK_ACTIONS.filter((action) => !action.permission || can(role, action.permission));

  if (!actions.length) return null;

  return (
    <div
      className="fixed z-50 lg:bottom-8 lg:left-auto lg:right-6"
      style={{ bottom: 'calc(5.75rem + env(safe-area-inset-bottom, 0px))', left: '1rem' }}
    >
      {/* جوال PWA — ورقة سفلية بأهداف لمس كبيرة */}
      <button
        type="button"
        className={cn(fabClass, 'lg:hidden')}
        aria-label="إضافة سريعة"
        onClick={() => setSheetOpen(true)}
      >
        <Plus className="h-6 w-6 stroke-[2]" />
      </button>
      <MobileSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="إضافة سريعة"
        description="اختر العملية وافتح شاشة التسجيل مباشرة."
      >
        <ActionList actions={actions} onNavigate={() => setSheetOpen(false)} />
      </MobileSheet>

      {/* سطح المكتب — قائمة منسدلة */}
      <div className="hidden lg:block">
        <DropdownMenu>
          <DropdownMenuTrigger className={fabClass} aria-label="إضافة سريعة">
            <Plus className="h-6 w-6 stroke-[2] transition-transform duration-150 ease-out group-data-[state=open]:rotate-45" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" sideOffset={12} className="w-[300px] p-2">
            <DropdownMenuLabel className="px-2 py-2">
              <div className="space-y-0.5">
                <p className="text-[13px] font-bold text-foreground">إضافة سريعة</p>
                <p className="text-[11.5px] font-normal text-muted-foreground">اختر العملية وافتح شاشة التسجيل مباشرة.</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="grid gap-1">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <DropdownMenuItem key={action.href} asChild className="p-0">
                    <Link href={action.href} className="flex items-center gap-3 rounded-lg px-2.5 py-2.5">
                      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1', action.tone)}>
                        <Icon className="h-4.5 w-4.5 stroke-[1.7]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-foreground">{action.label}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{action.description}</span>
                      </span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
