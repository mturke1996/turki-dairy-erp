'use client';

import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function CopyableValue({
  value,
  label,
  className,
  mono = true,
}: {
  value: string;
  label?: string;
  className?: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const text = value.trim();
  if (!text) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(label ? `تم نسخ ${label}` : 'تم النسخ');
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('تعذّر النسخ');
    }
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      {label ? <span className="text-muted-foreground">{label}</span> : null}
      <span className={cn(mono && 'font-mono')} dir="ltr">
        {text}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={copy}
        aria-label={label ? `نسخ ${label}` : 'نسخ'}
        title="نسخ"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-meadow-600" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </span>
  );
}
