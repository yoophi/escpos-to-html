import { ReceiptRail, type ReceiptRailItem } from '@escpos-to-html/ui';
import { type ReceiptViewModel } from '@/entities/receipt';

type ReceiptPreviewPanelProps = {
  receipts: ReceiptViewModel[];
  selectedReceiptId: string | null;
  onSelectReceipt: (receiptId: string) => void;
};

export function ReceiptPreviewPanel({ receipts, selectedReceiptId, onSelectReceipt }: ReceiptPreviewPanelProps) {
  return (
    <section className="rounded-xl border bg-background shadow-sm">
      <div className="border-b px-4 py-3">
        <p className="text-sm text-muted-foreground">Preview</p>
        <h2 className="font-semibold">Thermal receipts</h2>
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
        onSelectReceipt={onSelectReceipt}
      />
    </section>
  );
}
