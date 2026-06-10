'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** ورقة سفلية للجوال — مناسبة لـ PWA و iOS standalone */
export function MobileSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-navy-950/45 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] w-full overflow-y-auto',
            'rounded-t-3xl border border-b-0 border-border bg-card shadow-lift',
            'pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-2',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            'duration-300',
          )}
        >
          <div className="mx-auto mb-3 mt-1 h-1 w-10 rounded-full bg-border" aria-hidden />
          <div className="px-5 pb-2 text-right">
            <DialogPrimitive.Title className="text-[16px] font-bold text-foreground">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-[12.5px] text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          <div className="px-4">{children}</div>
          <DialogPrimitive.Close
            className="absolute left-4 top-4 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-canvas-sunken"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
