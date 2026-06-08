import { cn } from '@/lib/utils';
import Image from 'next/image';
import { BRAND } from '@/lib/brand';

/**
 * شعار مصنع التركي — الاسم + الشعار الرسومي (icon-512).
 * - mark: الشعار فقط
 * - compact / navbar: للشريط العلوي
 * - lockup / sidebar: للسايدبار
 * - hero / full: صفحة الدخول
 */
export function BrandLogo({
  variant = 'lockup',
  className,
  priority = false,
}: {
  variant?: 'mark' | 'lockup' | 'compact' | 'navbar' | 'sidebar' | 'full' | 'hero';
  className?: string;
  priority?: boolean;
}) {
  const isCompact = variant === 'compact' || variant === 'navbar';
  const isLockup = variant === 'lockup' || variant === 'sidebar';
  const isHero = variant === 'hero' || variant === 'full';

  const isMark = variant === 'mark';

  const emblemSize = isMark
    ? 'h-14 w-14'
    : isCompact
      ? 'h-11 w-11 sm:h-12 sm:w-12'
      : isLockup
        ? 'h-14 w-14 sm:h-16 sm:w-16'
        : 'h-20 w-20 sm:h-24 sm:w-24';

  const emblem = (
    <Image
      src={BRAND.logoMarkSrc}
      alt=""
      width={isHero ? 96 : isLockup ? 64 : isMark ? 56 : 48}
      height={isHero ? 96 : isLockup ? 64 : isMark ? 56 : 48}
      priority={priority}
      className={cn('h-auto w-auto shrink-0 object-contain', emblemSize)}
    />
  );

  if (variant === 'mark') {
    return (
      <div className={cn('relative shrink-0', className)} aria-hidden>
        {emblem}
      </div>
    );
  }

  if (isHero) {
    return (
      <div className={cn('flex flex-col items-center gap-4', className)}>
        {emblem}
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{BRAND.name}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">{BRAND.taglineShort}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3',
        isCompact ? 'gap-2.5 sm:gap-3' : 'gap-3',
        className,
      )}
    >
      <div className="min-w-0 flex-1 text-right">
        <p
          className={cn(
            'font-bold leading-tight text-foreground',
            isCompact ? 'text-[14px] sm:text-[15px]' : 'text-[15px] sm:text-[16px]',
          )}
        >
          {BRAND.name}
        </p>
        <p
          className={cn(
            'mt-0.5 leading-snug text-muted-foreground',
            isCompact ? 'text-[10.5px] line-clamp-1 sm:text-[11px]' : 'text-[11px] sm:text-[12px]',
          )}
        >
          {BRAND.taglineShort}
        </p>
      </div>
      {emblem}
    </div>
  );
}
