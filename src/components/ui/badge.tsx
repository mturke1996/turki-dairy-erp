import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold tracking-[0.04em] [&>svg]:size-3 [&>svg]:stroke-[1.6]',
  {
    variants: {
      variant: {
        default: 'bg-navy-100 text-navy-700',
        neutral: 'bg-canvas-sunken text-ink-mute border border-border',
        success: 'bg-pastel-green text-pastel-greenInk',
        warning: 'bg-pastel-yellow text-pastel-yellowInk',
        danger: 'bg-pastel-red text-pastel-redInk',
        info: 'bg-pastel-blue text-pastel-blueInk',
        meadow: 'bg-meadow-100 text-meadow-700',
        sun: 'bg-sun-100 text-sun-800',
        plum: 'bg-pastel-plum text-pastel-plumInk',
        outline: 'border border-border bg-transparent text-ink-mute',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
