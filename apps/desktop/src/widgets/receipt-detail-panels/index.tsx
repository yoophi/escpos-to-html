import { type ReactNode } from 'react';
import { type ReceiptViewModel } from '@/entities/receipt';

type ReceiptDetailPanelsProps = {
  receipt: ReceiptViewModel | null;
  formatBytes: (bytes: number[]) => string;
};

export function ReceiptDetailPanels({ receipt, formatBytes }: ReceiptDetailPanelsProps) {
  if (!receipt) return null;

  return (
    <section className="grid min-h-0 gap-4 xl:grid-cols-3">
      <InfoPanel title="Parsed Data">
        <pre>{JSON.stringify(receipt.parsed, null, 2)}</pre>
      </InfoPanel>
      <InfoPanel title="Decoded Bytes">
        <pre>{formatBytes(receipt.bytes)}</pre>
      </InfoPanel>
      <InfoPanel title="HTML">
        <pre>{receipt.html}</pre>
      </InfoPanel>
    </section>
  );
}

function InfoPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="min-h-0 rounded-xl border bg-background shadow-sm">
      <div className="border-b px-4 py-3">
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="max-h-72 overflow-auto p-4 text-xs">
        <div className="whitespace-pre-wrap break-words font-mono">{children}</div>
      </div>
    </article>
  );
}
