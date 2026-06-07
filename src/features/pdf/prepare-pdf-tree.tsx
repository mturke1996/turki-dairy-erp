'use client';

import type { ReactElement } from 'react';
import { fetchBrandPdfAssets } from './fetch-brand-assets';
import { PdfLogoProvider } from './pdf-logo-context';

/** يجلب أصول الهوية ثم يلفّ مستند PDF ليقرأها المكوّنات من السياق. */
export async function preparePdfTree(element: ReactElement): Promise<ReactElement> {
  const { logoDataUri, letterheadDataUri } = await fetchBrandPdfAssets();
  return (
    <PdfLogoProvider uri={logoDataUri} letterheadUri={letterheadDataUri}>
      {element}
    </PdfLogoProvider>
  );
}
