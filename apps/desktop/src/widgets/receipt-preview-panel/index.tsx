import { useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import {
  Button,
  PresetSegment,
  ReceiptRail,
  receiptFontPresets,
  type ReceiptFontId,
  type ReceiptRailItem,
} from '@escpos-to-html/ui';
import { type ReceiptViewModel } from '@/entities/receipt';

type ReceiptPreviewPanelProps = {
  receipts: ReceiptViewModel[];
  selectedReceiptId: string | null;
  onSelectReceipt: (receiptId: string) => void;
};

export function ReceiptPreviewPanel({ receipts, selectedReceiptId, onSelectReceipt }: ReceiptPreviewPanelProps) {
  const [fontId, setFontId] = useState<ReceiptFontId>('d2coding');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen]);

  return (
    <section
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 flex flex-col overflow-hidden bg-background'
          : 'rounded-xl border bg-background shadow-sm'
      }
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <p className="text-sm text-muted-foreground">Preview</p>
          <h2 className="font-semibold">Thermal receipts</h2>
        </div>
        <div className="flex items-center gap-2">
          <PresetSegment
            ariaLabel="Receipt font preset"
            items={receiptFontPresets}
            value={fontId}
            onValueChange={setFontId}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            onClick={() => setIsFullscreen((value) => !value)}
          >
            {isFullscreen ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
          </Button>
        </div>
      </div>
      <div className={isFullscreen ? 'min-h-0 flex-1 overflow-y-auto' : undefined}>
        <ReceiptRail
          className={isFullscreen ? 'min-h-full' : undefined}
          receipts={receipts.map(
            (receipt): ReceiptRailItem => ({
              id: receipt.id,
              title: new Date(receipt.receivedAt).toLocaleTimeString(),
              description: `${receipt.bytes.length} bytes`,
              lines: receipt.parsed.lines,
            }),
          )}
          selectedReceiptId={selectedReceiptId}
          columns={42}
          font={fontId}
          onSelectReceipt={onSelectReceipt}
        />
      </div>
    </section>
  );
}
