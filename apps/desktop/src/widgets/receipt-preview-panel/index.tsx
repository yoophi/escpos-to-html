import { useState } from 'react';
import {
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

  return (
    <section className="rounded-xl border bg-background shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <p className="text-sm text-muted-foreground">Preview</p>
          <h2 className="font-semibold">Thermal receipts</h2>
        </div>
        <PresetSegment
          ariaLabel="Receipt font preset"
          items={receiptFontPresets}
          value={fontId}
          onValueChange={setFontId}
        />
      </div>
      <ReceiptRail
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
    </section>
  );
}
