import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="space-y-1.5">
        {eyebrow ? (
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-meadow-600">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-[28px]">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-[13px] leading-relaxed text-muted-foreground sm:text-[13.5px]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
