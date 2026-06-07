'use client';

import { Font } from '@react-pdf/renderer';

/** اسم عائلة الخط داخل ملف PDF (خط Tajawal المضمّن). */
export const PDF_FONT_FAMILY = 'TurkiPdf';

/** يسجّل Tajawal مع احتياط italic؛ يُستدعى قبل كل توليد، والتكرار يُتجاهَل بهدوء. */
export function registerPdfFonts(): void {
  if (typeof window === 'undefined') return;
  try {
    const origin = window.location.origin;
    Font.register({
      family: PDF_FONT_FAMILY,
      fonts: [
        { src: `${origin}/fonts/Tajawal-Regular.ttf`, fontWeight: 400, fontStyle: 'normal' },
        { src: `${origin}/fonts/Tajawal-Regular.ttf`, fontWeight: 400, fontStyle: 'italic' },
        { src: `${origin}/fonts/Tajawal-Bold.ttf`, fontWeight: 700, fontStyle: 'normal' },
        { src: `${origin}/fonts/Tajawal-Bold.ttf`, fontWeight: 700, fontStyle: 'italic' },
      ],
    });
    Font.registerHyphenationCallback((word) => [word]);
  } catch {
    /* تسجيل مكرر */
  }
}

if (typeof window !== 'undefined') {
  registerPdfFonts();
}
