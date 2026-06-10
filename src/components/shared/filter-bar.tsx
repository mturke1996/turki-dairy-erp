import { cn } from '@/lib/utils';

/** شريط فلاتر موحّد — بحث + شرائح حالة */
export function FilterBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center', className)}>
      {children}
    </div>
  );
}

export function FilterChip({
  active,
  onClick,
  children,
  count,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors',
        active
          ? 'border-meadow-200 bg-meadow-50 text-meadow-800'
          : 'border-border bg-card text-muted-foreground hover:bg-canvas-sunken',
        className,
      )}
    >
      {children}
      {count != null ? (
        <span
          className={cn(
            'min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold tabular',
            active ? 'bg-meadow-100 text-meadow-800' : 'bg-canvas-sunken text-muted-foreground',
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
