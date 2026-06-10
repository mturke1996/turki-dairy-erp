'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** قسم قابل للطي على الجوال — يقلّل التمرير الطويل دون إخفاء البيانات */
export function DashboardCollapsibleSection({
  title,
  description,
  badge,
  children,
  defaultOpen = false,
  className,
}: {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={cn('lg:hidden', className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-start transition-[transform,background-color] duration-150 ease-out active:scale-[0.99] active:bg-canvas-sunken/50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-semibold text-foreground">{title}</p>
            {badge}
          </div>
          {description ? <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">{description}</p> : null}
        </div>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out', open && 'rotate-180')}
        />
      </button>
      {open ? <div className="mt-2.5 space-y-3">{children}</div> : null}
    </section>
  );
}
