'use client';

import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = Omit<React.ComponentProps<typeof Input>, 'onCopy'> & {
  copyLabel?: string;
};

export function CopyableInput({ value, className, copyLabel, ...props }: Props) {
  const [copied, setCopied] = useState(false);
  const text = String(value ?? '').trim();

  async function copy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(copyLabel ? `تم نسخ ${copyLabel}` : 'تم النسخ');
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('تعذّر النسخ');
    }
  }

  return (
    <div className="relative">
      <Input
        {...props}
        value={value}
        className={cn('pe-10', className)}
        readOnly={props.readOnly}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute end-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        onClick={copy}
        disabled={!text}
        aria-label={copyLabel ? `نسخ ${copyLabel}` : 'نسخ'}
        title="نسخ"
      >
        {copied ? <Check className="h-4 w-4 text-meadow-600" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
