'use client';

import { useState, useRef, useCallback, type ReactElement } from 'react';
import { FileDown, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePermission } from '@/lib/store/use-permission';
import { renderPdfBlob, savePdfBlob } from './pdf-blob-utils';
import { PdfPreviewDialog } from './pdf-preview-dialog';

type Props = {
  /** بدون امتداد .pdf */
  fileName: string;
  render: () => Promise<ReactElement>;
  disabled?: boolean;
  showDownload?: boolean;
  label?: string;
  variant?: 'default' | 'outline' | 'meadow' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
};

export function TurkiPdfToolbar({
  fileName,
  render,
  disabled,
  showDownload = true,
  label = 'عرض PDF',
  variant = 'default',
  size = 'sm',
  className,
}: Props) {
  const canExport = usePermission('data.export');
  const [openBusy, setOpenBusy] = useState(false);
  const [dlBusy, setDlBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function';

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  }, []);

  const closePreview = useCallback(
    (open: boolean) => {
      setPreviewOpen(open);
      if (!open) {
        revokePreviewUrl();
        blobRef.current = null;
      }
    },
    [revokePreviewUrl],
  );

  async function ensureBlob(): Promise<Blob> {
    if (blobRef.current) return blobRef.current;
    const blob = await renderPdfBlob(render);
    blobRef.current = blob;
    return blob;
  }

  async function handleOpen() {
    if (openBusy || disabled) return;
    setOpenBusy(true);
    const id = toast.loading('جاري إنشاء ملف PDF…');
    try {
      const blob = await ensureBlob();
      revokePreviewUrl();
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
      setPreviewOpen(true);
      toast.success('تم تجهيز PDF للعرض', { id });
    } catch (e) {
      console.error(e);
      toast.error('تعذّر إنشاء PDF', { id, description: e instanceof Error ? e.message : undefined });
    } finally {
      setOpenBusy(false);
    }
  }

  async function handleDownload() {
    if (dlBusy || disabled) return;
    setDlBusy(true);
    const id = toast.loading('جاري تجهيز التحميل…');
    try {
      const blob = await ensureBlob();
      const mode = await savePdfBlob(blob, fileName);
      toast.success(mode === 'share' ? 'اختر «حفظ في الملفات»' : 'تم تنزيل الملف', { id });
    } catch (e) {
      console.error(e);
      toast.error('تعذّر تنزيل PDF', { id, description: e instanceof Error ? e.message : undefined });
    } finally {
      setDlBusy(false);
    }
  }

  async function handleShare() {
    if (shareBusy || disabled) return;
    setShareBusy(true);
    try {
      const blob = await ensureBlob();
      await savePdfBlob(blob, fileName);
    } catch (e) {
      if (!(e instanceof Error && e.name === 'AbortError')) toast.error('تعذّر مشاركة الملف');
    } finally {
      setShareBusy(false);
    }
  }

  if (!canExport) return null;

  return (
    <>
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        <Button type="button" variant={variant} size={size} disabled={disabled || openBusy} onClick={handleOpen}>
          {openBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {label}
        </Button>
        {showDownload ? (
          <Button type="button" variant="outline" size={size} disabled={disabled || dlBusy} onClick={handleDownload}>
            {dlBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            تحميل
          </Button>
        ) : null}
      </div>

      <PdfPreviewDialog
        open={previewOpen}
        onOpenChange={closePreview}
        url={previewUrl}
        fileName={fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`}
        onDownload={handleDownload}
        downloadBusy={dlBusy}
        canShare={canShareFiles}
        onShare={handleShare}
        shareBusy={shareBusy}
      />
    </>
  );
}
