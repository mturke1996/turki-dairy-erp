import { BRAND } from '@/lib/brand';

async function fetchAsDataUri(path: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const url = `${window.location.origin}${path}`;
    const res = await fetch(url, { credentials: 'same-origin', cache: 'force-cache' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export type BrandPdfAssets = {
  logoDataUri: string | null;
  letterheadDataUri: string | null;
};

/** يحمّل الشعار والورقة الرسمية كـ data URI لاستخدامهما في react-pdf. */
export async function fetchBrandPdfAssets(): Promise<BrandPdfAssets> {
  const [logoDataUri, letterheadDataUri] = await Promise.all([
    fetchAsDataUri(BRAND.logoSrc),
    fetchAsDataUri(BRAND.letterheadSrc),
  ]);
  return { logoDataUri, letterheadDataUri };
}

/** @deprecated استخدم fetchBrandPdfAssets */
export async function fetchBrandLogoDataUri(): Promise<string | null> {
  const { logoDataUri } = await fetchBrandPdfAssets();
  return logoDataUri;
}
