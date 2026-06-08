'use client';

import { Loader2 } from 'lucide-react';
import { BrandLogo } from './brand-logo';
import { BRAND } from '@/lib/brand';

/** شاشة انتظار أثناء تحميل البيانات من PostgreSQL */
export function AppSplash() {
  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6"
      style={{ backgroundColor: BRAND.colors.navy }}
    >
      <div className="w-full max-w-[280px] rounded-2xl bg-white px-4 py-4">
        <BrandLogo variant="hero" priority />
      </div>
      <div className="flex flex-col items-center gap-3 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-meadow-300" aria-hidden />
        <p className="text-[14px] font-medium">جارٍ تحميل البيانات…</p>
        <p className="max-w-xs text-center text-[12px] leading-relaxed text-white/60">
          {BRAND.name} — متصل بقاعدة البيانات
        </p>
      </div>
    </div>
  );
}
