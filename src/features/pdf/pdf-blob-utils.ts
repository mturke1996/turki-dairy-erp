import type { ReactElement } from 'react';
import { pdf } from '@react-pdf/renderer';
import { registerPdfFonts } from './pdfFonts';
import { preparePdfTree } from './prepare-pdf-tree';

export async function renderPdfBlob(render: () => Promise<ReactElement>): Promise<Blob> {
  registerPdfFonts();
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

export function shouldUseInAppPdfViewer(): boolean {
  if (typeof navigator === 'undefined') return true;
  return true;
}

export async function savePdfBlob(blob: Blob, fileName: string): Promise<'share' | 'download'> {
  const name = normalizePdfFileName(fileName);
  const file = new File([blob], name, { type: 'application/pdf' });

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
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
