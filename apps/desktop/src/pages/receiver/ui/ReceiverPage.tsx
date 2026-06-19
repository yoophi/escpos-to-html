import { useReceiptReceiver } from '@/features/receipt-receiver';
import { ReceiptDetailPanels } from '@/widgets/receipt-detail-panels';
import { ReceiptPreviewPanel } from '@/widgets/receipt-preview-panel';
import { ReceiptSidebar } from '@/widgets/receipt-sidebar';
import { ReceiverHeader } from '@/widgets/receiver-header';

export function ReceiverPage() {
  const {
    config,
    setConfig,
    status,
    receipts,
    selectedReceipt,
    selectedReceiptId,
    setSelectedReceiptId,
    error,
    startServer,
    stopServer,
    clearReceipts,
    formatBytes,
  } = useReceiptReceiver();

  return (
    <main className="flex h-screen min-h-0 flex-col bg-background text-foreground">
      <ReceiverHeader
        config={config}
        status={status}
        error={error}
        onConfigChange={setConfig}
        onStart={startServer}
        onStop={stopServer}
      />

      <section className="grid min-h-0 flex-1 grid-cols-[340px_minmax(0,1fr)]">
        <ReceiptSidebar
          config={config}
          receipts={receipts}
          selectedReceiptId={selectedReceiptId}
          onSelectReceipt={setSelectedReceiptId}
          onClearReceipts={clearReceipts}
        />

        <section className="min-h-0 overflow-auto bg-muted/40 p-5">
          {receipts.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed bg-background text-muted-foreground">
              수신된 영수증이 없습니다.
            </div>
          ) : (
            <div className="grid min-h-0 gap-4">
              <ReceiptPreviewPanel
                receipts={receipts}
                selectedReceiptId={selectedReceiptId}
                onSelectReceipt={setSelectedReceiptId}
              />
              <ReceiptDetailPanels receipt={selectedReceipt} formatBytes={formatBytes} />
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
