'use client';

import { useEffect } from 'react';

/**
 * يسجّل Service Worker في بيئة الإنتاج فقط (لتفادي تعارض كاش الأصول مع HMR أثناء التطوير).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* تجاهل أخطاء التسجيل */
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
