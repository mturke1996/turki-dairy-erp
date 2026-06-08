import { cn } from '@/lib/utils';
import Image from 'next/image';
import { BRAND } from '@/lib/brand';

/** أبعاد الشعار الأفقي الكامل (نسبة تقريبية من الهوية الرسمية) */
const LOCKUP = {
  /** سايدبار — عرض كامل */
  lockup: { width: 220, height: 72, h: 'h-[52px] sm:h-[58px]', w: 'w-full max-w-[220px]' },
  /** شريط علوي — جوال */
  compact: { width: 180, height: 56, h: 'h-9', w: 'max-w-[160px] sm:max-w-[180px]' },
  /** صفحة الدخول */
  hero: { width: 320, height: 104, h: 'h-20 sm:h-24', w: 'w-full max-w-[320px]' },
  /** عرض كامل */
  full: { width: 280, height: 92, h: 'h-[72px]', w: 'w-full max-w-[280px]' },
  /** أيقونة فقط — PWA / favicon context */
  mark: { width: 48, height: 48, h: 'h-10 w-10', w: 'h-10 w-10' },
} as const;

/**
 * شعار مصنع التركي — صورة الهوية الأفقية الكاملة (الاسم + الشعار).
 * variant=mark يستخدم الشعار الرسومي فقط للمساحات الضيقة.
 */
export function BrandLogo({
  variant = 'lockup',
  className,
  priority = false,
}: {
  variant?: 'mark' | 'lockup' | 'compact' | 'full' | 'hero';
  className?: string;
  priority?: boolean;
}) {
  const size = LOCKUP[variant === 'hero' ? 'hero' : variant === 'full' ? 'full' : variant === 'compact' ? 'compact' : variant === 'mark' ? 'mark' : 'lockup'];

  if (variant === 'mark') {
    return (
      <div className={cn('relative shrink-0', className)} aria-hidden>
        <Image
          src={BRAND.logoMarkSrc}
          alt=""
          width={size.width}
          height={size.height}
          priority={priority}
          className={cn('object-contain', size.h, size.w)}
        />
      </div>
    );
  }

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <Image
        src={BRAND.logoLockupSrc}
        alt={BRAND.fullName}
        width={size.width}
        height={size.height}
        priority={priority}
        className={cn('object-contain object-right', size.h, size.w)}
      />
    </div>
  );
}

