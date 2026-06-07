'use client';

import React, { createContext, useContext } from 'react';
import type { BrandPdfAssets } from './fetch-brand-assets';

type PdfBrandCtx = BrandPdfAssets;

const PdfBrandContext = createContext<PdfBrandCtx>({ logoDataUri: null, letterheadDataUri: null });

export function PdfLogoProvider({
  uri,
  letterheadUri,
  children,
}: {
  uri: string | null | undefined;
  letterheadUri?: string | null | undefined;
  children: React.ReactNode;
}) {
  return (
    <PdfBrandContext.Provider value={{ logoDataUri: uri ?? null, letterheadDataUri: letterheadUri ?? null }}>
      {children}
    </PdfBrandContext.Provider>
  );
}

export function usePdfLogoDataUri(): string | null {
  return useContext(PdfBrandContext).logoDataUri;
}

export function usePdfLetterheadDataUri(): string | null {
  return useContext(PdfBrandContext).letterheadDataUri;
}
