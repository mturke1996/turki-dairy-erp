import type { ReactElement } from 'react';
import { pdf } from '@react-pdf/renderer';
import { ensurePdfFontsLoaded } from './pdfFonts';
import { preparePdfTree } from './prepare-pdf-tree';

export async function renderPdfBlob(render: () => Promise<ReactElement>): Promise<Blob> {
  await ensurePdfFontsLoaded();
  const wrapped = await preparePdfTree(await render());
  const instance = pdf();
  instance.updateContainer(wrapped);
  return instance.toBlob();
}

export function normalizePdfFileName(fileName: string): string {
  return fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
}

/** رابط عرض PDF داخل المتصفح — عرض مناسب للصفحة بدون شريط جانبي */
export function buildPdfViewerUrl(blobUrl: string): string {
  const base = blobUrl.split('#')[0];
  return `${base}#view=FitH&navpanes=0&scrollbar=1`;
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/** على iPhone/Android نفتح التبويب مباشرة — embed داخل Dialog ضعيف */
export function shouldUseInAppPdfViewer(): boolean {
  return !isMobileDevice();
}

export function canSharePdfFiles(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
  try {
    const probe = new File([''], 'probe.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * فتح PDF في تبويب جديد — نفس أسلوب Etlala (ممتاز على iPhone).
 * يُبقي الرابط حياً دقيقتين لتحميل التبويب.
 */
export function openPdfInNewTab(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  const tab = window.open(url, '_blank', 'noopener,noreferrer');
  if (!tab) {
    window.location.href = url;
  }
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
  return url;
}

export async function savePdfBlob(blob: Blob, fileName: string): Promise<'share' | 'download'> {
  const name = normalizePdfFileName(fileName);
  const file = new File([blob], name, { type: 'application/pdf' });

  if (canSharePdfFiles() && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name.replace(/\.pdf$/i, '') });
      return 'share';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'share';
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  return 'download';
}
