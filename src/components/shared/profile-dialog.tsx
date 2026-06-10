'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** ملف شخص (موظف / عميل / فلاح) — ملء الشاشة على الجوال دون تجاوز العرض */
export const PROFILE_DIALOG_SHELL = cn(
  '!flex !max-h-[100dvh] flex-col gap-0 !overflow-hidden p-0',
  'max-h-[100dvh] h-[100dvh] w-[100vw] max-w-[100vw] rounded-none border-0',
  'left-0 top-0 translate-x-0 translate-y-0',
  'sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[min(92dvh,820px)] sm:w-full sm:max-w-3xl',
  'sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:p-6 sm:gap-4',
);

/** محتوى بروفايل — تمرير واحد متسلّل على الجوال */
export function ProfileUnifiedScroll({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className={cn(
          'min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4',
          'pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-0 sm:py-0 sm:pb-0',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function ProfileActionStack({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center [&_button]:w-full [&_button]:justify-center sm:[&_button]:w-auto">
      {children}
    </div>
  );
}

export function ProfileDialogBody({
  header,
  children,
  className,
}: {
  header: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <>
      <div className="shrink-0 space-y-4 border-b border-border px-4 py-4 sm:border-0 sm:p-0">
        {header}
      </div>
      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4',
          'pb-[max(1rem,env(safe-area-inset-bottom))] sm:overflow-visible sm:px-0 sm:py-0 sm:pb-0',
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}

export function ProfileTabsList({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1 no-scrollbar md:mx-0 md:overflow-visible md:px-0 md:pb-0">
      <div className="flex w-max min-w-full gap-1 md:w-full">{children}</div>
    </div>
  );
}

export function ProfileTimelineList({
  children,
  empty,
}: {
  children: ReactNode;
  empty?: ReactNode;
}) {
  return <div className="space-y-2.5 md:hidden">{children ?? empty}</div>;
}

export function ProfileTimelineCard({
  title,
  subtitle,
  badge,
  rows,
  amount,
  amountClassName,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  rows?: { label: string; value: ReactNode }[];
  amount?: ReactNode;
  amountClassName?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-whisper">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-snug text-foreground">{title}</p>
          {subtitle ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
      {rows && rows.length > 0 ? (
        <div className="mt-2.5 space-y-1.5 border-t border-border/80 pt-2.5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 text-[12px]">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="shrink-0 font-medium tabular-nums text-foreground">{row.value}</span>
            </div>
          ))}
        </div>
      ) : null}
      {amount ? (
        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border/80 pt-2.5">
          <span className="text-[11px] text-muted-foreground">المبلغ</span>
          <span className={cn('text-[15px] font-bold tabular-nums', amountClassName)}>{amount}</span>
        </div>
      ) : null}
      {actions ? <div className="mt-2.5 flex justify-end border-t border-border/80 pt-2">{actions}</div> : null}
    </div>
  );
}

export function ProfileDesktopTable({ children }: { children: ReactNode }) {
  return <div className="hidden md:block">{children}</div>;
}
