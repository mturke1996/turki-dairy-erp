import Image from 'next/image';
import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand';

/**
 * شعار مصنع التركي الرسمي.
 * - mark: أيقونة مربعة (PWA / الشريط العلوي على الجوال)
 * - lockup: شعار أفقي للشريط الجانبي
 * - full: عرض كامل متوسط
 * - hero: عرض كبير (صفحة الدخول)
 */
export function BrandLogo({
  variant = 'lockup',
  className,
  priority = false,
}: {
  variant?: 'mark' | 'lockup' | 'full' | 'hero';
  className?: string;
  priority?: boolean;
}) {
  if (variant === 'mark') {
    return (
      <div
        className={cn(
          'relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-border/50',
          className,
        )}
      >
        <Image
          src={BRAND.icons.pwa192}
          alt={BRAND.name}
          width={40}
          height={40}
          priority={priority}
          className="h-full w-full object-contain p-0.5"
        />
      </div>
    );
  }

  const sizes = {
    hero: { w: 360, h: 140, maxH: 'max-h-[140px]' },
    full: { w: 280, h: 108, maxH: 'max-h-[108px]' },
    lockup: { w: 220, h: 72, maxH: 'max-h-[72px]' },
  } as const;

  const size = variant === 'hero' || variant === 'full' ? sizes[variant] : sizes.lockup;

  return (
    <div
      className={cn(
        'relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-white px-3 py-2 ring-1 ring-border/40',
        size.maxH,
        className,
      )}
    >
      <Image
        src={BRAND.logoSrc}
        alt={BRAND.fullName}
        width={size.w}
        height={size.h}
        priority={priority}
        className="h-auto w-full max-w-full object-contain"
      />
    </div>
  );
}
