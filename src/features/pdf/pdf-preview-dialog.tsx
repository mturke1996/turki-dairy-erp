'use client';

import { Download, Loader2, Share2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
  fileName: string;
  onDownload: () => void;
  downloadBusy?: boolean;
  canShare?: boolean;
  onShare?: () => void;
  shareBusy?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[92vh] max-w-4xl gap-0 overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <p className="truncate text-[13px] font-semibold text-foreground" dir="ltr">
            {fileName}
          </p>
          <div className="flex items-center gap-2">
            {canShare && onShare ? (
              <Button variant="outline" size="sm" onClick={onShare} disabled={shareBusy}>
                {shareBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                مشاركة
              </Button>
            ) : null}
            <Button size="sm" onClick={onDownload} disabled={downloadBusy}>
              {downloadBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              تحميل
            </Button>
          </div>
        </div>
        {url ? (
          <iframe title={fileName} src={url} className="h-full w-full flex-1 bg-canvas-sunken" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
