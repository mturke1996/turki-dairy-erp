'use client';

import { CalendarRange } from 'lucide-react';
import { toast } from 'sonner';
import { useErpStore } from '@/lib/store/use-erp-store';
import { sessionDisplayLabel } from '@/lib/domain/cycle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function SessionSwitcher() {
  const sessions = useErpStore((s) => s.sessions);
  const activeSessionId = useErpStore((s) => s.activeSessionId);
  const setActiveSession = useErpStore((s) => s.setActiveSession);

  const ordered = [...sessions].sort((a, b) => b.periodFrom.localeCompare(a.periodFrom));
  const active = ordered.find((s) => s.id === activeSessionId);

  return (
    <Select
      value={activeSessionId}
      onValueChange={(id) => {
        void (async () => {
          const res = await setActiveSession(id);
          if (!res.ok) toast.error(res.error ?? 'تعذّر تبديل الدورة');
        })();
      }}
    >
      <SelectTrigger
        className={cn(
          'h-9 shrink-0 gap-1.5 bg-card px-2 sm:px-3',
          'w-[108px] xs:w-[120px] sm:w-[168px] md:w-[200px] lg:w-[220px]',
        )}
        aria-label="اختيار الدورة النشطة"
      >
        <CalendarRange className="hidden h-4 w-4 shrink-0 text-meadow-600 sm:block" />
        <span className="min-w-0 flex-1 truncate text-right text-[12px] font-medium sm:text-[13px]">
          {active ? (
            <>
              <span className="sm:hidden">{sessionDisplayLabel(active, 'micro')}</span>
              <span className="hidden sm:inline">{sessionDisplayLabel(active, 'compact')}</span>
            </>
          ) : (
            <SelectValue placeholder="الدورة" />
          )}
        </span>
      </SelectTrigger>
      <SelectContent align="end" className="max-w-[min(100vw-2rem,320px)]">
        {ordered.map((s) => (
          <SelectItem key={s.id} value={s.id} className="py-2.5">
            <span className="flex w-full items-center justify-between gap-2">
              <span className="truncate text-[13px]">{sessionDisplayLabel(s, 'full')}</span>
              {s.status === 'archived' ? (
                <Badge variant="neutral" className="shrink-0 text-[9px]">
                  مؤرشفة
                </Badge>
              ) : (
                <Badge variant="meadow" className="shrink-0 text-[9px]">
                  نشطة
                </Badge>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
