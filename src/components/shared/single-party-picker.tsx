'use client';

import { useMemo, useState } from 'react';
import { Check, Search, UserRound, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type SinglePartyOption = {
  id: string;
  label: string;
  sublabel?: string;
  meta?: string;
};

type Props = {
  value: string;
  onChange: (id: string) => void;
  options: SinglePartyOption[];
  /** مثال: «فلاح» أو «عميل» */
  partyLabel: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
};

export function SinglePartyPicker({
  value,
  onChange,
  options,
  partyLabel,
  placeholder = 'اختر من القائمة',
  searchPlaceholder = 'بحث بالاسم أو الكود…',
  emptyMessage = 'لا توجد نتائج.',
  disabled,
  className,
}: Props) {
  const [query, setQuery] = useState('');
  const [browsing, setBrowsing] = useState(false);

  const selected = options.find((o) => o.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.sublabel?.toLowerCase().includes(q) ||
        o.meta?.toLowerCase().includes(q),
    );
  }, [options, query]);

  function pick(id: string) {
    onChange(id);
    setQuery('');
    setBrowsing(false);
  }

  const showList = !selected || browsing;

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-[11px] text-muted-foreground">
        {partyLabel} واحد فقط لكل عملية — لا يمكن اختيار أكثر من {partyLabel}.
      </p>

      {selected && !browsing ? (
        <div
          className="flex items-start gap-3 rounded-xl border border-meadow-200 bg-meadow-50/60 px-3 py-3 ring-1 ring-meadow-100"
          role="status"
          aria-live="polite"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-meadow-100 text-meadow-700">
            <UserRound className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-foreground">{selected.label}</p>
            {selected.sublabel ? (
              <p className="truncate text-[12px] text-muted-foreground">{selected.sublabel}</p>
            ) : null}
            {selected.meta ? (
              <p className="mt-0.5 text-[11px] font-medium text-meadow-800">{selected.meta}</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-[12px]"
            disabled={disabled}
            onClick={() => setBrowsing(true)}
          >
            تغيير
          </Button>
        </div>
      ) : null}

      {showList ? (
        <div className="space-y-2 rounded-xl border border-border bg-card p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-11 pr-9 text-[14px]"
              disabled={disabled}
              aria-label={`بحث عن ${partyLabel}`}
            />
            {selected && browsing ? (
              <button
                type="button"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-canvas-sunken hover:text-foreground"
                onClick={() => {
                  setBrowsing(false);
                  setQuery('');
                }}
                aria-label="إلغاء التغيير"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <ul
            className="max-h-52 space-y-1 overflow-y-auto overscroll-contain"
            role="listbox"
            aria-label={placeholder}
          >
            {filtered.length ? (
              filtered.map((o) => {
                const active = o.id === value;
                return (
                  <li key={o.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      disabled={disabled}
                      onClick={() => pick(o.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-right transition-colors',
                        'min-h-[44px] active:scale-[0.99]',
                        active
                          ? 'bg-navy-50 text-navy-900 ring-1 ring-navy-200'
                          : 'hover:bg-canvas-sunken/80',
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold">{o.label}</span>
                        {o.sublabel ? (
                          <span className="block truncate text-[11.5px] text-muted-foreground">{o.sublabel}</span>
                        ) : null}
                      </span>
                      {active ? <Check className="h-4 w-4 shrink-0 text-navy-600" aria-hidden /> : null}
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-6 text-center text-[12.5px] text-muted-foreground">{emptyMessage}</li>
            )}
          </ul>

          {selected && browsing ? (
            <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setBrowsing(false)}>
              الإبقاء على {selected.label}
            </Button>
          ) : null}
        </div>
      ) : null}

      {!selected && !showList ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setBrowsing(true)}
          className="flex h-11 w-full items-center justify-center rounded-lg border border-dashed border-border text-[13px] text-muted-foreground hover:bg-canvas-sunken/50"
        >
          {placeholder}
        </button>
      ) : null}
    </div>
  );
}
