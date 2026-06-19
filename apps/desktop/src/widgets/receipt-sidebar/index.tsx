import { Trash2 } from 'lucide-react';
import { Button } from '@escpos-to-html/ui';
import { type ReceiptViewModel, type TcpServerConfig } from '@/entities/receipt';

type ReceiptSidebarProps = {
  config: TcpServerConfig;
  receipts: ReceiptViewModel[];
  selectedReceiptId: string | null;
  onSelectReceipt: (receiptId: string) => void;
  onClearReceipts: () => void;
};

export function ReceiptSidebar({ config, receipts, selectedReceiptId, onSelectReceipt, onClearReceipts }: ReceiptSidebarProps) {
  return (
    <aside className="flex min-h-0 flex-col border-r bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="font-semibold">Receipts</h2>
          <p className="text-sm text-muted-foreground">{receipts.length} received</p>
        </div>
        <Button type="button" variant="outline" size="icon" onClick={onClearReceipts} aria-label="Clear receipts">
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {receipts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            TCP 데이터를 기다리는 중입니다. 예: <code>nc {config.host} {config.port}</code>
          </div>
        ) : (
          <ul className="space-y-2">
            {receipts.map((receipt) => (
              <li key={receipt.id}>
                <button
                  type="button"
                  className={[
                    'w-full rounded-lg border p-3 text-left transition-colors',
                    receipt.id === selectedReceiptId ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-accent',
                  ].join(' ')}
                  onClick={() => onSelectReceipt(receipt.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{new Date(receipt.receivedAt).toLocaleTimeString()}</span>
                    <span className="text-xs opacity-75">{receipt.bytes.length} bytes</span>
                  </div>
                  <div className="mt-1 truncate text-xs opacity-75">{receipt.client.peerAddr}</div>
                  <div className="mt-2 text-xs opacity-75">{receipt.reason}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
