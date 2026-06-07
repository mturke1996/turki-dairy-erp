import { BrandLogo } from './brand-logo';
import { BRAND } from '@/lib/brand';

/** شاشة تحميل — أثناء جلب البيانات من PostgreSQL. */
export function AppSplash() {
  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center"
      style={{ backgroundColor: BRAND.colors.navy }}
    >
      <div className="flex flex-col items-center gap-5 px-6">
        <div className="w-56 rounded-2xl bg-white px-5 py-4 shadow-lift">
          <BrandLogo variant="full" priority />
        </div>
        <p className="text-[13px] font-medium text-white/70">{BRAND.fullName}</p>
        <p className="text-[12px] text-white/50">جارٍ تحميل البيانات من قاعدة البيانات…</p>
        <div className="h-1 w-32 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full w-1/2 animate-[shimmer_1.2s_ease-in-out_infinite] rounded-full"
            style={{ backgroundColor: BRAND.colors.green }}
          />
        </div>
      </div>
    </div>
  );
}
