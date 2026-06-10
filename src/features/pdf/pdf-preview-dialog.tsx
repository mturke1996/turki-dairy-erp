'use client';

import { FileDown, Loader2, Share2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { buildPdfViewerUrl } from './pdf-blob-utils';

type PdfPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
  fileName: string;
  onDownload: () => void;
  downloadBusy?: boolean;
  canShare?: boolean;
  onShare?: () => void;
  shareBusy?: boolean;
};

export function PdfPreviewDialog({
  open,
  onOpenChange,
  url,
  fileName,
  onDownload,
  downloadBusy,
  canShare,
  onShare,
  shareBusy,
}: PdfPreviewDialogProps) {
  const viewerUrl = url ? buildPdfViewerUrl(url) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex flex-col gap-0 overflow-hidden p-0',
          'max-w-[100vw] w-[100vw] h-[100dvh] max-h-[100dvh] rounded-none border-0',
          'sm:max-w-4xl sm:w-[min(100vw-2rem,56rem)] sm:h-[min(92dvh,900px)] sm:max-h-[92dvh] sm:rounded-2xl sm:border',
        )}
        dir="rtl"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">عرض {fileName}</DialogTitle>

        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3 py-2.5 sm:px-4">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground" dir="ltr">
            {fileName}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {canShare && onShare ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1 touch-manipulation"
                disabled={shareBusy}
                onClick={onShare}
              >
                {shareBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                <span className="sr-only sm:not-sr-only sm:inline">مشاركة</span>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="meadow"
              size="sm"
              className="h-9 gap-1 touch-manipulation"
              disabled={downloadBusy}
              onClick={onDownload}
            >
              {downloadBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              <span className="sr-only sm:not-sr-only sm:inline">تحميل</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 touch-manipulation"
              aria-label="إغلاق"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 bg-neutral-200 dark:bg-neutral-800">
          {viewerUrl ? (
            <embed
              src={viewerUrl}
              type="application/pdf"
              title={fileName}
              className="absolute inset-0 h-full w-full border-0 bg-white"
            />
          ) : (
            <LoadingIndicator
              size="lg"
              label="جارٍ تجهيز المعاينة…"
              className="min-h-[50dvh] justify-center text-meadow-600"
            />
          )}
        </div>

        <p className="shrink-0 border-t border-border bg-canvas-sunken/60 px-3 py-2 text-center text-[11px] text-muted-foreground sm:hidden">
          إن لم يظهر الملف، استخدم «مشاركة» أو «تحميل» أعلاه
        </p>
      </DialogContent>
    </Dialog>
  );
}
