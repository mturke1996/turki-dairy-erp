'use client';

import { CalendarRange } from 'lucide-react';
import { useErpStore } from '@/lib/store/use-erp-store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export function SessionSwitcher() {
  const sessions = useErpStore((s) => s.sessions);
  const activeSessionId = useErpStore((s) => s.activeSessionId);
  const setActiveSession = useErpStore((s) => s.setActiveSession);

  const ordered = [...sessions].sort((a, b) => b.periodFrom.localeCompare(a.periodFrom));

  return (
    <Select value={activeSessionId} onValueChange={setActiveSession}>
      <SelectTrigger className="h-9 w-[180px] gap-2 bg-card">
        <CalendarRange className="h-4 w-4 text-meadow-600" />
        <SelectValue placeholder="اختر الفترة" />
      </SelectTrigger>
      <SelectContent>
        {ordered.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            <span className="flex items-center gap-2">
              {s.label}
              {s.status === 'archived' ? (
                <Badge variant="neutral" className="text-[9px]">
                  مؤرشفة
                </Badge>
              ) : (
                <Badge variant="meadow" className="text-[9px]">
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
