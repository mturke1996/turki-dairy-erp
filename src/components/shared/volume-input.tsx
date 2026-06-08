'use client';

import { Input } from '@/components/ui/input';
import { cn, sanitizeDecimalInput } from '@/lib/utils';

/**
 * حقل كمية للعربية (RTL):
 * الرقم على اليمين ← «لتر» على اليسار (تُقرأ بعد الرقم).
 */
export function VolumeInput({
  value,
  onChange,
  unit = 'لتر',
  placeholder = '0',
  className,
  id,
  required,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      dir="rtl"
      className={cn(
        'flex h-10 w-full overflow-hidden rounded-md border border-input bg-background shadow-whisper',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background',
        disabled && 'opacity-50',
        className,
      )}
    >
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        dir="ltr"
        required={required}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(sanitizeDecimalInput(e.target.value))}
        placeholder={placeholder}
        className="h-full flex-1 border-0 bg-transparent text-left shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <span className="flex shrink-0 items-center border-s border-input bg-canvas-sunken px-3 text-[13px] font-medium text-muted-foreground">
        {unit}
      </span>
    </div>
  );
}
