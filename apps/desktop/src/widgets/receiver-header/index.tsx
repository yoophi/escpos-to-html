import { Server, Square } from 'lucide-react';
import { Button } from '@escpos-to-html/ui';
import { type TcpServerConfig, type TcpServerStatus } from '@/entities/receipt';

type ReceiverHeaderProps = {
  config: TcpServerConfig;
  status: TcpServerStatus;
  error: string | null;
  onConfigChange: (updater: (current: TcpServerConfig) => TcpServerConfig) => void;
  onStart: () => void;
  onStop: () => void;
};

const statusText = (status: TcpServerStatus) => {
  if (status.status === 'listening') return `${status.host}:${status.port}`;
  if (status.status === 'starting') return 'Starting';
  if (status.status === 'failed') return status.message;
  return 'Stopped';
};

export function ReceiverHeader({ config, status, error, onConfigChange, onStart, onStop }: ReceiverHeaderProps) {
  const isListening = status.status === 'listening';

  return (
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
              onChange={(event) => onConfigChange((current) => ({ ...current, host: event.target.value }))}
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
                onConfigChange((current) => ({
                  ...current,
                  port: Number(event.target.value),
                }))
              }
              disabled={isListening}
            />
          </label>
          <Button type="button" onClick={onStart} disabled={isListening}>
            <Server aria-hidden="true" />
            Start
          </Button>
          <Button type="button" variant="outline" onClick={onStop} disabled={!isListening}>
            <Square aria-hidden="true" />
            Stop
          </Button>
          <div className="min-w-44 rounded-md border bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">Status</span>
            <div className="font-medium">{statusText(status)}</div>
          </div>
        </section>
      </div>
      {error ? (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </header>
  );
}
