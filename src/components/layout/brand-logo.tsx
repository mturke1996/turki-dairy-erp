import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand';

/**
 * شعار مصنع التركي الرسمي.
 * - lockup: الشعار الكامل مقصوص رأسياً (يزيل الهامش الأبيض) لاستخدامه في الأماكن الضيقة.
 * - full: الشعار كاملاً بنسبته الأصلية (لشاشة الدخول وصفحات الأبطال).
 */
export function BrandLogo({
  variant = 'lockup',
  className,
}: {
  variant?: 'lockup' | 'full';
  className?: string;
}) {
  if (variant === 'full') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={BRAND.logoSrc}
        alt={BRAND.fullName}
        className={cn('h-auto w-full object-contain', className)}
      />
    );
  }
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BRAND.logoSrc}
        alt={BRAND.fullName}
        className="absolute inset-0 h-full w-full scale-[1.55] object-cover object-center"
      />
    </div>
  );
}
