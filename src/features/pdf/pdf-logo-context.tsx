'use client';

import React, { createContext, useContext } from 'react';
import type { BrandPdfAssets } from './fetch-brand-assets';

const PdfBrandContext = createContext<BrandPdfAssets>({
  logoDataUri: null,
  markDataUri: null,
  letterheadDataUri: null,
});

export function PdfLogoProvider({
  uri,
  markUri,
  letterheadUri,
  children,
}: {
  uri: string | null | undefined;
  markUri?: string | null | undefined;
  letterheadUri?: string | null | undefined;
  children: React.ReactNode;
}) {
  return (
    <PdfBrandContext.Provider
      value={{
        logoDataUri: uri ?? null,
        markDataUri: markUri ?? null,
        letterheadDataUri: letterheadUri ?? null,
      }}
    >
      {children}
    </PdfBrandContext.Provider>
  );
}

/** الشعار الأفقي الكامل — ترويسة PDF */
export function usePdfLogoDataUri(): string | null {
  return useContext(PdfBrandContext).logoDataUri;
}

/** الشعار الرسومي فقط */
export function usePdfMarkDataUri(): string | null {
  return useContext(PdfBrandContext).markDataUri;
}

export function usePdfLetterheadDataUri(): string | null {
  return useContext(PdfBrandContext).letterheadDataUri;
}
