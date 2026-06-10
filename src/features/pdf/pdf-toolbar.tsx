'use client';

import { useState, useRef, useCallback, type ReactElement } from 'react';
import { FileDown, FileText, Loader2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePermission } from '@/lib/store/use-permission';
import {
  renderPdfBlob,
  savePdfBlob,
  openPdfInNewTab,
  canSharePdfFiles,
  shouldUseInAppPdfViewer,
  buildPdfViewerUrl,
} from './pdf-blob-utils';
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
  label = 'فتح PDF',
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

  const canShare = canSharePdfFiles();

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

  /** فتح PDF — تبويب جديد على الهاتف (مثل Etlala)، معاينة داخل التطبيق على سطح المكتب */
  async function handleOpen() {
    if (openBusy || disabled) return;
    setOpenBusy(true);
    const id = toast.loading('جاري إنشاء ملف PDF…');
    try {
      const blob = await ensureBlob();

      if (shouldUseInAppPdfViewer()) {
        revokePreviewUrl();
        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;
        setPreviewUrl(buildPdfViewerUrl(url));
        setPreviewOpen(true);
        toast.success('تم تجهيز PDF للعرض', { id });
      } else {
        openPdfInNewTab(blob);
        toast.success('تم فتح PDF', { id });
      }
    } catch (e) {
      console.error('[PDF]', e);
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('تعذّر إنشاء PDF', {
        id,
        description: msg.includes('textkit') || msg.includes("'id'")
          ? 'خطأ في تنسيق النص — أعد تحميل الصفحة وحاول مجدداً'
          : msg,
      });
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
    const id = toast.loading('جاري تحضير الملف للمشاركة…');
    try {
      const blob = await ensureBlob();
      const mode = await savePdfBlob(blob, fileName);
      if (mode === 'share') {
        toast.success('تمت المشاركة', { id });
      } else {
        openPdfInNewTab(blob);
        toast.success('تم فتح PDF', { id });
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === 'AbortError')) {
        toast.error('تعذّر مشاركة الملف', { id });
      } else {
        toast.dismiss(id);
      }
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

        {canShare ? (
          <Button type="button" variant="outline" size={size} disabled={disabled || shareBusy} onClick={handleShare}>
            {shareBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            مشاركة
          </Button>
        ) : null}

        {showDownload ? (
          <Button type="button" variant="outline" size={size} disabled={disabled || dlBusy} onClick={handleDownload}>
            {dlBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            تحميل
          </Button>
        ) : null}
      </div>

      {shouldUseInAppPdfViewer() ? (
        <PdfPreviewDialog
          open={previewOpen}
          onOpenChange={closePreview}
          url={previewUrl}
          fileName={fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`}
          onDownload={handleDownload}
          downloadBusy={dlBusy}
          canShare={canShare}
          onShare={handleShare}
          shareBusy={shareBusy}
        />
      ) : null}
    </>
  );
}
