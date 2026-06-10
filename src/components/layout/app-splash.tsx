'use client';

import Image from 'next/image';
import { BRAND } from '@/lib/brand';

/** شاشة انتظار — شعار PNG شفاف كما أرسله المستخدم، بدون أي معالجة */
export function AppSplash() {
  return (
    <div
      className="paper relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-5 py-10 sm:px-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="جارٍ تحميل البيانات"
    >
      <div className="relative z-10 flex w-full max-w-[min(100%,600px)] flex-col items-center">
        <div className="w-full animate-fade-up" style={{ animationDelay: '70ms' }}>
          <Image
            src={BRAND.splashLogoSrc}
            alt={BRAND.fullName}
            width={1536}
            height={1024}
            priority
            className="mx-auto h-auto w-full max-w-[min(94vw,560px)] object-contain"
          />
        </div>

        <div
          className="mt-8 flex w-full max-w-[320px] flex-col items-center gap-5 animate-fade-up sm:mt-10"
          style={{ animationDelay: '200ms' }}
        >
          <SplashProgress />
          <div className="space-y-1 text-center">
            <p className="text-[15px] font-semibold text-foreground sm:text-[16px]">
              جارٍ تحميل البيانات…
            </p>
            <p className="text-[12.5px] text-muted-foreground sm:text-[13px]">
              {BRAND.nameLatin} · متصل بقاعدة البيانات
            </p>
          </div>
        </div>
      </div>

      <p
        className="relative z-10 mt-auto pt-8 text-center text-[11px] text-muted-foreground/70 animate-fade-in"
        style={{ animationDelay: '320ms' }}
      >
        {BRAND.region}
      </p>
    </div>
  );
}

function SplashProgress() {
  return (
    <div className="h-[3px] w-full overflow-hidden rounded-full bg-border" aria-hidden>
      <div
        className="h-full w-[38%] animate-splash-progress rounded-full"
        style={{
          background: `linear-gradient(to left, ${BRAND.colors.green}, ${BRAND.colors.sun})`,
        }}
      />
    </div>
  );
}
