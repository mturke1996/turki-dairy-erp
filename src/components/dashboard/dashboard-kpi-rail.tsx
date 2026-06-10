'use client';

import { cn } from '@/lib/utils';

/** شريط مؤشرات أفقي للجوال — snap scroll بدون ازدحام الشبكة */
export function DashboardKpiRail({
  title = 'مؤشرات سريعة',
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('lg:hidden', className)}>
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <h2 className="text-[14px] font-semibold text-foreground">{title}</h2>
        <span className="text-[10.5px] font-medium text-muted-foreground">اسحب للمزيد ←</span>
      </div>
      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-0.5 snap-x snap-mandatory no-scrollbar">
        {children}
      </div>
    </section>
  );
}

export function DashboardKpiRailItem({ children }: { children: React.ReactNode }) {
  return <div className="w-[9.25rem] shrink-0 snap-start sm:w-[10rem]">{children}</div>;
}
