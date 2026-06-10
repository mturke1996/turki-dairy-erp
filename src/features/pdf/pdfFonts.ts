'use client';

import { Font } from '@react-pdf/renderer';

/** اسم عائلة الخط داخل ملف PDF (خط Tajawal المضمّن). */
export const PDF_FONT_FAMILY = 'TurkiPdf';

let fontsLoadPromise: Promise<void> | null = null;

/** يسجّل Tajawal — يُستدعى قبل كل توليد. */
export function registerPdfFonts(): void {
  if (typeof window === 'undefined') return;
  try {
    const origin = window.location.origin;
    Font.register({
      family: PDF_FONT_FAMILY,
      fonts: [
        { src: `${origin}/fonts/Tajawal-Regular.ttf`, fontWeight: 400, fontStyle: 'normal' },
        { src: `${origin}/fonts/Tajawal-Bold.ttf`, fontWeight: 700, fontStyle: 'normal' },
      ],
    });
    Font.registerHyphenationCallback((word) => [word]);
  } catch {
    /* تسجيل مكرر */
  }
}

/**
 * ينتظر تحميل Tajawal فعلياً قبل layout — بدون هذا يفشل textkit في المتصفح.
 */
export async function ensurePdfFontsLoaded(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!fontsLoadPromise) {
    fontsLoadPromise = (async () => {
      registerPdfFonts();
      await Promise.all([
        Font.load({ fontFamily: PDF_FONT_FAMILY, fontWeight: 400, fontStyle: 'normal' }),
        Font.load({ fontFamily: PDF_FONT_FAMILY, fontWeight: 700, fontStyle: 'normal' }),
      ]);
    })().catch((err) => {
      fontsLoadPromise = null;
      throw err;
    });
  }
  return fontsLoadPromise;
}

if (typeof window !== 'undefined') {
  registerPdfFonts();
}
