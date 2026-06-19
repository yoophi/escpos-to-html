import { Server, Square, Trash2 } from 'lucide-react';
import { type ReactNode } from 'react';
import { Button, ReceiptRail, type ReceiptRailItem } from '@escpos-to-html/ui';
import { type TcpServerStatus } from '@/entities/receipt';
import { useReceiptReceiver } from '../model/useReceiptReceiver';

const statusText = (status: TcpServerStatus) => {
  if (status.status === 'listening') return `${status.host}:${status.port}`;
  if (status.status === 'starting') return 'Starting';
  if (status.status === 'failed') return status.message;
  return 'Stopped';
};

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
  const isListening = status.status === 'listening';

  return (
    <main className="flex h-screen min-h-0 flex-col bg-background text-foreground">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">ESC/POS TCP Receiver</p>
            <h1 className="text-3xl font-bold tracking-tight">영수증 프리뷰 수신함</h1>
          </div>
          <section className="flex flex-wrap items-end gap-3" aria-label="TCP server controls">
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Host</span>
              <input
                className="h-10 w-36 rounded-md border bg-background px-3"
                value={config.host}
                onChange={(event) => setConfig((current) => ({ ...current, host: event.target.value }))}
                disabled={isListening}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Port</span>
              <input
                className="h-10 w-28 rounded-md border bg-background px-3"
                type="number"
                min={1}
                max={65535}
                value={config.port}
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    port: Number(event.target.value),
                  }))
                }
                disabled={isListening}
              />
            </label>
            <Button type="button" onClick={startServer} disabled={isListening}>
              <Server aria-hidden="true" />
              Start
            </Button>
            <Button type="button" variant="outline" onClick={stopServer} disabled={!isListening}>
              <Square aria-hidden="true" />
              Stop
            </Button>
            <div className="min-w-44 rounded-md border bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">Status</span>
              <div className="font-medium">{statusText(status)}</div>
            </div>
          </section>
        </div>
        {error ? <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      </header>

      <section className="grid min-h-0 flex-1 grid-cols-[340px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-r bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="font-semibold">Receipts</h2>
              <p className="text-sm text-muted-foreground">{receipts.length} received</p>
            </div>
            <Button type="button" variant="outline" size="icon" onClick={clearReceipts} aria-label="Clear receipts">
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
                      onClick={() => setSelectedReceiptId(receipt.id)}
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

        <section className="min-h-0 overflow-auto bg-muted/40 p-5">
          {receipts.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed bg-background text-muted-foreground">
              수신된 영수증이 없습니다.
            </div>
          ) : (
            <div className="grid min-h-0 gap-4">
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
                  onSelectReceipt={setSelectedReceiptId}
                />
              </section>

              {selectedReceipt ? (
                <section className="grid min-h-0 gap-4 xl:grid-cols-3">
                  <InfoPanel title="Parsed Data">
                    <pre>{JSON.stringify(selectedReceipt.parsed, null, 2)}</pre>
                  </InfoPanel>
                  <InfoPanel title="Decoded Bytes">
                    <pre>{formatBytes(selectedReceipt.bytes)}</pre>
                  </InfoPanel>
                  <InfoPanel title="HTML">
                    <pre>{selectedReceipt.html}</pre>
                  </InfoPanel>
                </section>
              ) : null}
            </div>
          )}
        </section>
      </section>
    </main>
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
